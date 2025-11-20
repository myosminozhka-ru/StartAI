import { flatten } from 'lodash'
import { Tool } from '@langchain/core/tools'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChainValues } from '@langchain/core/utils/types'
import { AgentStep } from '@langchain/core/agents'
import { renderTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatConversationalAgent } from 'langchain/agents'
import { getBaseClasses, transformBracesWithColon } from '../../../src/utils'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import {
    IVisionChatModal,
    OsmiMemory,
    ICommonObject,
    INode,
    INodeData,
    INodeParams,
    IUsedTool,
    IServerSideEventStreamer
} from '../../../src/Interface'
import { AgentExecutor } from '../../../src/agents'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

const DEFAULT_PREFIX = `Ассистент - это большая языковая модель, обученная OpenAI.

Ассистент разработан для оказания помощи в широком спектре задач, от ответов на простые вопросы до предоставления подробных объяснений и обсуждений на различные темы. Как языковая модель, Ассистент способен генерировать текст, похожий на человеческий, на основе полученного ввода, что позволяет ему вести естественно звучащие беседы и давать ответы, которые логичны и релевантны обсуждаемой теме.

Ассистент постоянно учится и совершенствуется, его возможности постоянно развиваются. Он способен обрабатывать и понимать большие объемы текста и может использовать эти знания для предоставления точных и информативных ответов на широкий спектр вопросов. Кроме того, Ассистент способен генерировать свой собственный текст на основе полученного ввода, что позволяет ему участвовать в обсуждениях и предоставлять объяснения и описания на различные темы.

В целом, Ассистент - это мощная система, которая может помочь с широким спектром задач и предоставить ценные идеи и информацию по различным темам. Независимо от того, нужна ли вам помощь с конкретным вопросом или вы просто хотите поговорить на определенную тему, Ассистент здесь, чтобы помочь.`

const TEMPLATE_TOOL_RESPONSE = `ОТВЕТ ИНСТРУМЕНТА:
---------------------
{observation}

ВВОД ПОЛЬЗОВАТЕЛЯ
--------------------

Хорошо, так каков ответ на мой последний комментарий? Если вы используете информацию, полученную из инструментов, вы должны явно упомянуть об этом, не упоминая названия инструментов - я забыл все ОТВЕТЫ ИНСТРУМЕНТОВ! Помните, что нужно ответить фрагментом кода markdown с json-объектом, содержащим одно действие, и НИЧЕГО больше.`

class ConversationalAgent_Agents implements INode {
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
        this.label = 'Conversational Agent'
        this.name = 'conversationalAgent'
        this.version = 3.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description = 'Разговорный агент для чат-модели. Будет использовать специальные промпты для чата'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Разрешенные инструменты',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Чат-модель',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Память',
                name: 'memory',
                type: 'BaseChatMemory'
            },
            {
                label: 'Системное сообщение',
                name: 'systemMessage',
                type: 'string',
                rows: 4,
                default: DEFAULT_PREFIX,
                optional: true,
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

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        return prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const memory = nodeData.inputs?.memory as OsmiMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId
        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the BabyAGI agent
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (options.shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }
        const executor = await prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })

        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        let res: ChainValues = {}
        let sourceDocuments: ICommonObject[] = []
        let usedTools: IUsedTool[] = []

        if (options.shouldStreamResponse) {
            const handler = new CustomChainHandler(shouldStreamResponse ? sseStreamer : undefined, chatId)
            res = await executor.invoke({ input }, { callbacks: [loggerHandler, handler, ...callbacks] })
            if (res.sourceDocuments) {
                if (options.sseStreamer) {
                    sseStreamer.streamSourceDocumentsEvent(options.chatId, flatten(res.sourceDocuments))
                }
                sourceDocuments = res.sourceDocuments
            }
            if (res.usedTools) {
                sseStreamer.streamUsedToolsEvent(options.chatId, res.usedTools)
                usedTools = res.usedTools
            }
            // If the tool is set to returnDirect, stream the output to the client
            if (res.usedTools && res.usedTools.length) {
                let inputTools = nodeData.inputs?.tools
                inputTools = flatten(inputTools)
                for (const tool of res.usedTools) {
                    const inputTool = inputTools.find((inputTool: Tool) => inputTool.name === tool.tool)
                    if (inputTool && inputTool.returnDirect && options.sseStreamer) {
                        sseStreamer.streamTokenEvent(options.chatId, tool.toolOutput)
                    }
                }
            }
            if (sseStreamer) {
                sseStreamer.streamEndEvent(options.chatId)
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
    let tools = nodeData.inputs?.tools as Tool[]
    tools = flatten(tools)
    const memory = nodeData.inputs?.memory as OsmiMemory
    let systemMessage = nodeData.inputs?.systemMessage as string
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'
    const inputKey = memory.inputKey ? memory.inputKey : 'input'
    const prependMessages = options?.prependMessages

    const outputParser = ChatConversationalAgent.getDefaultOutputParser({
        llm: model,
        toolNames: tools.map((tool) => tool.name)
    })

    systemMessage = transformBracesWithColon(systemMessage)

    const prompt = ChatConversationalAgent.createPrompt(tools, {
        systemMessage: systemMessage ? systemMessage : DEFAULT_PREFIX,
        outputParser
    })

    if (llmSupportsVision(model)) {
        const visionChatModel = model as IVisionChatModal
        const messageContent = await addImagesToMessages(nodeData, options, model.multiModalOption)

        if (messageContent?.length) {
            visionChatModel.setVisionModel()

            // Pop the `agent_scratchpad` MessagePlaceHolder
            let messagePlaceholder = prompt.promptMessages.pop() as MessagesPlaceholder
            if (prompt.promptMessages.at(-1) instanceof HumanMessagePromptTemplate) {
                const lastMessage = prompt.promptMessages.pop() as HumanMessagePromptTemplate
                const template = (lastMessage.prompt as PromptTemplate).template as string
                const msg = HumanMessagePromptTemplate.fromTemplate([
                    ...messageContent,
                    {
                        text: template
                    }
                ])
                msg.inputVariables = lastMessage.inputVariables
                prompt.promptMessages.push(msg)
            }

            // Add the `agent_scratchpad` MessagePlaceHolder back
            prompt.promptMessages.push(messagePlaceholder)
        } else {
            visionChatModel.revertToOriginalModel()
        }
    }

    /** Bind a stop token to the model */
    const modelWithStop = model.bind({
        stop: ['\nObservation']
    })

    const runnableAgent = RunnableSequence.from([
        {
            [inputKey]: (i: { input: string; steps: AgentStep[] }) => i.input,
            agent_scratchpad: async (i: { input: string; steps: AgentStep[] }) => await constructScratchPad(i.steps),
            [memoryKey]: async (_: { input: string; steps: AgentStep[] }) => {
                const messages = (await memory.getChatMessages(flowObj?.sessionId, true, prependMessages)) as BaseMessage[]
                return messages ?? []
            }
        },
        prompt,
        modelWithStop,
        outputParser
    ])

    const executor = AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        tools,
        sessionId: flowObj?.sessionId,
        chatId: flowObj?.chatId,
        input: flowObj?.input,
        verbose: process.env.DEBUG === 'true',
        maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
    })

    return executor
}

const constructScratchPad = async (steps: AgentStep[]): Promise<BaseMessage[]> => {
    const thoughts: BaseMessage[] = []
    for (const step of steps) {
        thoughts.push(new AIMessage(step.action.log))
        thoughts.push(
            new HumanMessage(
                renderTemplate(TEMPLATE_TOOL_RESPONSE, 'f-string', {
                    observation: step.observation
                })
            )
        )
    }
    return thoughts
}

module.exports = { nodeClass: ConversationalAgent_Agents }
