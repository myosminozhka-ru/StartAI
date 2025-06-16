import { flatten } from 'lodash'
import { Tool } from '@langchain/core/tools'
import { BaseMessage } from '@langchain/core/messages'
import { ChainValues } from '@langchain/core/utils/types'
import { RunnableSequence } from '@langchain/core/runnables'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { formatToOpenAIToolMessages } from 'langchain/agents/format_scratchpad/openai_tools'
import { type ToolsAgentStep } from 'langchain/agents/openai/output_parser'
import {
    extractOutputFromArray,
    getBaseClasses,
    handleEscapeCharacters,
    removeInvalidImageMarkdown,
    transformBracesWithColon
} from '../../../src/utils'
import {
    FlowiseMemory,
    ICommonObject,
    INode,
    INodeData,
    INodeParams,
    IServerSideEventStreamer,
    IUsedTool,
    IVisionChatModal
} from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, CustomStreamingHandler, additionalCallbacks } from '../../../src/handler'
import { AgentExecutor, ToolCallingAgentOutputParser } from '../../../src/agents'
import { Moderation, checkInputs, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'

class ToolAgent_Agents implements INode {
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
        this.label = 'Агент инструментов'
        this.name = 'toolAgent'
        this.version = 2.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'toolAgent.png'
        this.description = `Агент, использующий Function Calling для выбора инструментов и аргументов для вызова`
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
                label: 'Чат-модель с поддержкой вызова инструментов',
                name: 'model',
                type: 'BaseChatModel',
                description:
                    'Совместимо только с моделями, поддерживающими вызов функций: ChatOpenAI, ChatMistral, ChatAnthropic, ChatGoogleGenerativeAI, ChatVertexAI, GroqChat'
            },
            {
                label: 'Шаблон чат-промпта',
                name: 'chatPromptTemplate',
                type: 'ChatPromptTemplate',
                description:
                    'Переопределить существующий промпт с помощью шаблона чат-промпта. Сообщение пользователя должно включать переменную {input}',
                optional: true
            },
            {
                label: 'Системное сообщение',
                name: 'systemMessage',
                type: 'string',
                default: `Вы - полезный ИИ-ассистент.`,
                description: 'Если предоставлен шаблон чат-промпта, это будет проигнорировано',
                rows: 4,
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
            },
            {
                label: 'Включить детальное стриминг',
                name: 'enableDetailedStreaming',
                type: 'boolean',
                default: false,
                description: 'Стриминг детальных промежуточных шагов во время выполнения агента',
                optional: true,
                additionalParams: true
            }
        ]
        this.sessionId = fields?.sessionId
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        return prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | ICommonObject> {
        const memory = nodeData.inputs?.memory as FlowiseMemory
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        const enableDetailedStreaming = nodeData.inputs?.enableDetailedStreaming as boolean

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Использовать выходные данные цепочки модерации как входные данные для агента OpenAI Function
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }

        const executor = await prepareAgent(nodeData, options, { sessionId: this.sessionId, chatId: options.chatId, input })

        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        // Add custom streaming handler if detailed streaming is enabled
        let customStreamingHandler = null

        if (enableDetailedStreaming && shouldStreamResponse) {
            customStreamingHandler = new CustomStreamingHandler(sseStreamer, chatId)
        }

        let res: ChainValues = {}
        let sourceDocuments: ICommonObject[] = []
        let usedTools: IUsedTool[] = []
        let artifacts = []

        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId)
            const allCallbacks = [loggerHandler, handler, ...callbacks]

            // Add detailed streaming handler if enabled
            if (enableDetailedStreaming && customStreamingHandler) {
                allCallbacks.push(customStreamingHandler)
            }

            res = await executor.invoke({ input }, { callbacks: allCallbacks })
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
            if (res.artifacts) {
                if (sseStreamer) {
                    sseStreamer.streamArtifactsEvent(chatId, flatten(res.artifacts))
                }
                artifacts = res.artifacts
            }
            // If the tool is set to returnDirect, stream the output to the client
            if (res.usedTools && res.usedTools.length) {
                let inputTools = nodeData.inputs?.tools
                inputTools = flatten(inputTools)
                for (const tool of res.usedTools) {
                    const inputTool = inputTools.find((inputTool: Tool) => inputTool.name === tool.tool)
                    if (inputTool && inputTool.returnDirect && shouldStreamResponse) {
                        sseStreamer.streamTokenEvent(chatId, tool.toolOutput)
                    }
                }
            }
        } else {
            const allCallbacks = [loggerHandler, ...callbacks]

            // Add detailed streaming handler if enabled
            if (enableDetailedStreaming && customStreamingHandler) {
                allCallbacks.push(customStreamingHandler)
            }

            res = await executor.invoke({ input }, { callbacks: allCallbacks })
            if (res.sourceDocuments) {
                sourceDocuments = res.sourceDocuments
            }
            if (res.usedTools) {
                usedTools = res.usedTools
            }
            if (res.artifacts) {
                artifacts = res.artifacts
            }
        }

        let output = res?.output
        output = extractOutputFromArray(res?.output)
        output = removeInvalidImageMarkdown(output)

        // Claude 3 Opus имеет тенденцию выводить <thinking>..</thinking>, удаляем это из финального вывода
        // https://docs.anthropic.com/en/docs/build-with-claude/tool-use#chain-of-thought
        const regexPattern: RegExp = /<thinking>[\s\S]*?<\/thinking>/
        const matches: RegExpMatchArray | null = output.match(regexPattern)
        if (matches) {
            for (const match of matches) {
                output = output.replace(match, '')
            }
        }

        await memory.addChatMessages(
            [
                {
                    text: input,
                    type: 'userMessage'
                },
                {
                    text: output,
                    type: 'apiMessage'
                }
            ],
            this.sessionId
        )

        let finalRes = output

        if (sourceDocuments.length || usedTools.length || artifacts.length) {
            const finalRes: ICommonObject = { text: output }
            if (sourceDocuments.length) {
                finalRes.sourceDocuments = flatten(sourceDocuments)
            }
            if (usedTools.length) {
                finalRes.usedTools = usedTools
            }
            if (artifacts.length) {
                finalRes.artifacts = artifacts
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
    const memoryKey = memory.memoryKey ? memory.memoryKey : 'chat_history'
    const inputKey = memory.inputKey ? memory.inputKey : 'input'
    const prependMessages = options?.prependMessages

    systemMessage = transformBracesWithColon(systemMessage)

    let prompt = ChatPromptTemplate.fromMessages([
        ['system', systemMessage],
        new MessagesPlaceholder(memoryKey),
        ['human', `{${inputKey}}`],
        new MessagesPlaceholder('agent_scratchpad')
    ])

    let promptVariables = {}
    const chatPromptTemplate = nodeData.inputs?.chatPromptTemplate as ChatPromptTemplate
    if (chatPromptTemplate && chatPromptTemplate.promptMessages.length) {
        const humanPrompt = chatPromptTemplate.promptMessages[chatPromptTemplate.promptMessages.length - 1]
        const messages = [
            ...chatPromptTemplate.promptMessages.slice(0, -1),
            new MessagesPlaceholder(memoryKey),
            humanPrompt,
            new MessagesPlaceholder('agent_scratchpad')
        ]
        prompt = ChatPromptTemplate.fromMessages(messages)
        if ((chatPromptTemplate as any).promptValues) {
            const promptValuesRaw = (chatPromptTemplate as any).promptValues
            const promptValues = handleEscapeCharacters(promptValuesRaw, true)
            for (const val in promptValues) {
                promptVariables = {
                    ...promptVariables,
                    [val]: () => {
                        return promptValues[val]
                    }
                }
            }
        }
    }

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

    if (model.bindTools === undefined) {
        throw new Error(`Этот агент требует, чтобы метод "bindTools()" был реализован во входной модели.`)
    }

    const modelWithTools = model.bindTools(tools)

    const runnableAgent = RunnableSequence.from([
        {
            [inputKey]: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
            agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(i.steps),
            [memoryKey]: async (_: { input: string; steps: ToolsAgentStep[] }) => {
                const messages = (await memory.getChatMessages(flowObj?.sessionId, true, prependMessages)) as BaseMessage[]
                return messages ?? []
            },
            ...promptVariables
        },
        prompt,
        modelWithTools,
        new ToolCallingAgentOutputParser()
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

module.exports = { nodeClass: ToolAgent_Agents }
