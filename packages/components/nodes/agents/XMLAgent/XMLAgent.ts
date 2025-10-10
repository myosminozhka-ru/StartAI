import { flatten } from 'lodash'
import { ChainValues } from '@langchain/core/utils/types'
import { AgentStep } from '@langchain/core/agents'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { RunnableSequence } from '@langchain/core/runnables'
import { Tool } from '@langchain/core/tools'
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { formatLogToMessage } from 'langchain/agents/format_scratchpad/log_to_message'
import { getBaseClasses, transformBracesWithColon } from '../../../src/utils'
import {
    FlowiseMemory,
    ICommonObject,
    IMessage,
    INode,
    INodeData,
    INodeParams,
    IServerSideEventStreamer,
    IUsedTool
} from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { AgentExecutor, XMLAgentOutputParser } from '../../../src/agents'
import { Moderation, checkInputs } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

const defaultSystemMessage = `Вы - полезный ассистент. Помогите пользователю ответить на любые вопросы.

У вас есть доступ к следующим инструментам:

{tools}

Для использования инструмента вы можете использовать теги <tool></tool> и <tool_input></tool_input>. Затем вы получите ответ в форме <observation></observation>
Например, если у вас есть инструмент 'search', который может выполнить поиск в Google, чтобы найти погоду в SF, вы ответите:

<tool>search</tool><tool_input>погода в SF</tool_input>
<observation>64 градуса</observation>

Когда вы закончите, ответьте финальным ответом между <final_answer></final_answer>. Например:

<final_answer>Погода в SF 64 градуса</final_answer>

Начнем!

Предыдущий разговор:
{chat_history}

Вопрос: {input}
{agent_scratchpad}`

class XMLAgent_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    sessionId?: string

    constructor(fields?: { sessionId?: string }) {
        this.label = 'XML Агент'
        this.name = 'xmlAgent'
        this.version = 2.0
        this.type = 'XMLAgent'
        this.category = 'Agents'
        this.icon = 'xmlagent.svg'
        this.description = `Агент, разработанный для языковых моделей, которые хорошо работают с рассуждениями/написанием XML (например: Anthropic Claude)`
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Инструменты',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Память',
                name: 'memory',
                type: 'BaseChatMemory'
            },
            {
                label: 'Чат-модель',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Системное сообщение',
                name: 'systemMessage',
                type: 'string',
                warning: 'Промпт должен включать входные переменные: {tools}, {chat_history}, {input} и {agent_scratchpad}',
                rows: 4,
                default: defaultSystemMessage,
                additionalParams: true
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки в языковую модель',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'Максимальное количество итераций',
                name: 'maxIterations',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Использовать выходные данные цепочки модерации как входные данные для агента OpenAI Function
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                // if (options.shouldStreamResponse) {
                //     streamResponse(options.sseStreamer, options.chatId, e.message)
                // }
                return formatResponse(e.message)
            }
        }
        const executor = await prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })

        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res: ChainValues = {}
        let sourceDocuments: ICommonObject[] = []
        let usedTools: IUsedTool[] = []

        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId)
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, handler, ...callbacks] })
            if (res.sourceDocuments) {
                if (sseStreamer) {
                    sseStreamer.streamSourceDocumentsEvent(chatId, flatten(res.sourceDocuments))
                }
                sourceDocuments = res.sourceDocuments
            }
            if (res.usedTools) {
                if (sseStreamer) {
                    sseStreamer.streamUsedToolsEvent(chatId, flatten(res.usedTools))
                }
                usedTools = res.usedTools
            }
            // Если инструмент настроен на прямой возврат, передаем вывод клиенту
            if (res.usedTools && res.usedTools.length) {
                let inputTools = nodeData.inputs?.tools
                inputTools = flatten(inputTools)
                for (const tool of res.usedTools) {
                    const inputTool = inputTools.find((inputTool: Tool) => inputTool.name === tool.tool)
                    if (inputTool && inputTool.returnDirect) {
                        if (sseStreamer) {
                            sseStreamer.streamTokenEvent(chatId, tool.toolOutput)
                        }
                    }
                }
            }
        } else {
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, ...callbacks] })
            if (res.sourceDocuments) {
                sourceDocuments = res.sourceDocuments
            }
            if (res.usedTools) {
                usedTools = res.usedTools
            }
        }

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: res?.output,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        let finalRes = res?.output

        if (sourceDocuments.length || usedTools.length) {
            finalRes = { text: res?.output }
            if (sourceDocuments.length) {
                finalRes.sourceDocuments = flatten(sourceDocuments)
            }
            if (usedTools.length) {
                finalRes.usedTools = usedTools
            }
            return finalRes
        }

        return finalRes
    }
}

const prepareAgent = async (
    nodeData: INodeData,
    options: ICommonObject,
    flowObj: { sessionId?: string; chatId?: string; input?: string }
) => {
    const model = nodeData.inputs?.model as BaseChatModel
    const maxIterations = nodeData.inputs?.maxIterations as string
    const memory = nodeData.inputs?.memory as FlowiseMemory
    let systemMessage = nodeData.inputs?.systemMessage as string
    let tools = nodeData.inputs?.tools
    tools = flatten(tools)
    const inputKey = memory.inputKey ? memory.inputKey : 'input'
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'
    const prependMessages = options?.prependMessages

    systemMessage = transformBracesWithColon(systemMessage)

    let promptMessage = systemMessage ? systemMessage : defaultSystemMessage
    if (memory.memoryKey) promptMessage = promptMessage.replaceAll('{chat_history}', `{${memory.memoryKey}}`)
    if (memory.inputKey) promptMessage = promptMessage.replaceAll('{input}', `{${memory.inputKey}}`)

    const prompt = ChatPromptTemplate.fromMessages([
        HumanMessagePromptTemplate.fromTemplate(promptMessage),
        new MessagesPlaceholder('agent_scratchpad')
    ])

    const missingVariables = ['tools', 'agent_scratchpad'].filter((v) => !prompt.inputVariables.includes(v))

    if (missingVariables.length > 0) {
        throw new Error(`Предоставленный промпт не содержит необходимых входных переменных: ${JSON.stringify(missingVariables)}`)
    }

    const llmWithStop = model.bind({ stop: ['</tool_input>', '</final_answer>'] })

    const messages = (await memory.getChatMessages(flowObj.sessionId, false, prependMessages)) as IMessage[]
    let chatHistoryMsgTxt = ''
    for (const message of messages) {
        if (message.type === 'apiMessage') {
            chatHistoryMsgTxt += `\\nИИ:${message.message}`
        } else if (message.type === 'userMessage') {
            chatHistoryMsgTxt += `\\nЧеловек:${message.message}`
        }
    }

    const runnableAgent = RunnableSequence.from([
        {
            [inputKey]: (i: { input: string; tools: Tool[]; steps: AgentStep[] }) => i.input,
            agent_scratchpad: (i: { input: string; tools: Tool[]; steps: AgentStep[] }) => formatLogToMessage(i.steps),
            tools: (_: { input: string; tools: Tool[]; steps: AgentStep[] }) =>
                tools.map((tool: Tool) => `${tool.name}: ${tool.description}`),
            [memoryKey]: (_: { input: string; tools: Tool[]; steps: AgentStep[] }) => chatHistoryMsgTxt
        },
        prompt,
        llmWithStop,
        new XMLAgentOutputParser()
    ])

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
        sessionId: flowObj?.sessionId,
        chatId: flowObj?.chatId,
        input: flowObj?.input,
        isXML: true,
        verbose: process.env.DEBUG === 'true',
        maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
    })

    return executor
}

module.exports = { nodeClass: XMLAgent_Agents }
