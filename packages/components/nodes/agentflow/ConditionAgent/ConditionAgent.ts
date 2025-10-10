import { AnalyticHandler } from '../../../src/handler'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import {
    getPastChatHistoryImageMessages,
    getUniqueImageMessages,
    processMessagesWithImages,
    replaceBase64ImagesWithFileReferences
} from '../utils'
import { CONDITION_AGENT_SYSTEM_PROMPT, DEFAULT_SUMMARIZER_TEMPLATE } from '../prompt'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

class ConditionAgent_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Агент условий'
        this.name = 'conditionAgentAgentflow'
        this.version = 1.0
        this.type = 'ConditionAgent'
        this.category = 'Agent Flows'
        this.description = `Использовать агента для разделения потоков на основе динамических условий`
        this.baseClasses = [this.type]
        this.color = '#ff8fab'
        this.inputs = [
            {
                label: 'Модель',
                name: 'conditionAgentModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true
            },
            {
                label: 'Инструкции',
                name: 'conditionAgentInstructions',
                type: 'string',
                description: 'Общие инструкции о том, что должен делать агент условий',
                rows: 4,
                acceptVariable: true,
                placeholder: 'Определить, интересуется ли пользователь изучением ИИ'
            },
            {
                label: 'Ввод',
                name: 'conditionAgentInput',
                type: 'string',
                description: 'Входные данные для использования агентом условий',
                rows: 4,
                acceptVariable: true,
                default: '<p><span class="variable" data-type="mention" data-id="question" data-label="question">{{ question }}</span> </p>'
            },
            {
                label: 'Сценарии',
                name: 'conditionAgentScenarios',
                description: 'Определить сценарии, которые будут использоваться как условия для разделения потока',
                type: 'array',
                array: [
                    {
                        label: 'Сценарий',
                        name: 'scenario',
                        type: 'string',
                        placeholder: 'Пользователь спрашивает о пицце'
                    }
                ],
                default: [
                    {
                        scenario: ''
                    },
                    {
                        scenario: ''
                    }
                ]
            }
            /*{
                label: 'Включить память',
                name: 'conditionAgentEnableMemory',
                type: 'boolean',
                description: 'Включить память для потока разговора',
                default: true,
                optional: true
            },
            {
                label: 'Тип памяти',
                name: 'conditionAgentMemoryType',
                type: 'options',
                options: [
                    {
                        label: 'Все сообщения',
                        name: 'allMessages',
                        description: 'Получить все сообщения из разговора'
                    },
                    {
                        label: 'Размер окна',
                        name: 'windowSize',
                        description: 'Использует фиксированный размер окна для отображения последних N сообщений'
                    },
                    {
                        label: 'Сводка разговора',
                        name: 'conversationSummary',
                        description: 'Обобщает весь разговор'
                    },
                    {
                        label: 'Буфер сводки разговора',
                        name: 'conversationSummaryBuffer',
                        description: 'Обобщает разговоры при достижении лимита токенов. По умолчанию 2000'
                    }
                ],
                optional: true,
                default: 'allMessages',
                show: {
                    conditionAgentEnableMemory: true
                }
            },
            {
                label: 'Размер окна',
                name: 'conditionAgentMemoryWindowSize',
                type: 'number',
                default: '20',
                description: 'Использует фиксированный размер окна для отображения последних N сообщений',
                show: {
                    conditionAgentMemoryType: 'windowSize'
                }
            },
            {
                label: 'Максимальный лимит токенов',
                name: 'conditionAgentMemoryMaxTokenLimit',
                type: 'number',
                default: '2000',
                description: 'Обобщает разговоры при достижении лимита токенов. По умолчанию 2000',
                show: {
                    conditionAgentMemoryType: 'conversationSummaryBuffer'
                }
            }*/
        ]
        this.outputs = [
            {
                label: '0',
                name: '0',
                description: 'Условие 0'
            },
            {
                label: '1',
                name: '1',
                description: 'Иначе'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as {
                [key: string]: INode
            }

            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Chat Models') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        }
    }

    private parseJsonMarkdown(jsonString: string): any {
        // Strip whitespace
        jsonString = jsonString.trim()
        const starts = ['```json', '```', '``', '`', '{']
        const ends = ['```', '``', '`', '}']

        let startIndex = -1
        let endIndex = -1

        // Find start of JSON
        for (const s of starts) {
            startIndex = jsonString.indexOf(s)
            if (startIndex !== -1) {
                if (jsonString[startIndex] !== '{') {
                    startIndex += s.length
                }
                break
            }
        }

        // Find end of JSON
        if (startIndex !== -1) {
            for (const e of ends) {
                endIndex = jsonString.lastIndexOf(e, jsonString.length)
                if (endIndex !== -1) {
                    if (jsonString[endIndex] === '}') {
                        endIndex += 1
                    }
                    break
                }
            }
        }

        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
            const extractedContent = jsonString.slice(startIndex, endIndex).trim()
            try {
                return JSON.parse(extractedContent)
            } catch (error) {
                throw new Error(`Invalid JSON object. Error: ${error}`)
            }
        }

        throw new Error('Could not find JSON block in the output.')
    }

    async run(nodeData: INodeData, question: string, options: ICommonObject): Promise<any> {
        let llmIds: ICommonObject | undefined
        let analyticHandlers = options.analyticHandlers as AnalyticHandler

        try {
            const abortController = options.abortController as AbortController

            // Extract input parameters
            const model = nodeData.inputs?.conditionAgentModel as string
            const modelConfig = nodeData.inputs?.conditionAgentModelConfig as ICommonObject
            if (!model) {
                throw new Error('Требуется модель')
            }
            const conditionAgentInput = nodeData.inputs?.conditionAgentInput as string
            let input = conditionAgentInput || question
            const conditionAgentInstructions = nodeData.inputs?.conditionAgentInstructions as string

            // Extract memory and configuration options
            const enableMemory = nodeData.inputs?.conditionAgentEnableMemory as boolean
            const memoryType = nodeData.inputs?.conditionAgentMemoryType as string
            const _conditionAgentScenarios = nodeData.inputs?.conditionAgentScenarios as { scenario: string }[]

            // Extract runtime state and history
            const state = options.agentflowRuntime?.state as ICommonObject
            const pastChatHistory = (options.pastChatHistory as BaseMessageLike[]) ?? []
            const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []

            // Initialize the LLM model instance
            const nodeInstanceFilePath = options.componentNodes[model].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newLLMNodeInstance = new nodeModule.nodeClass()
            const newNodeData = {
                ...nodeData,
                credential: modelConfig['FLOWISE_CREDENTIAL_ID'],
                inputs: {
                    ...nodeData.inputs,
                    ...modelConfig
                }
            }
            let llmNodeInstance = (await newLLMNodeInstance.init(newNodeData, '', options)) as BaseChatModel

            const isStructuredOutput =
                _conditionAgentScenarios && Array.isArray(_conditionAgentScenarios) && _conditionAgentScenarios.length > 0
            if (!isStructuredOutput) {
                throw new Error('Требуются сценарии')
            }

            // Prepare messages array
            const messages: BaseMessageLike[] = [
                {
                    role: 'system',
                    content: CONDITION_AGENT_SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: `{"input": "Hello", "scenarios": ["user is asking about AI", "default"], "instruction": "Your task is to check and see if user is asking topic about AI"}`
                },
                {
                    role: 'assistant',
                    content: `\`\`\`json\n{"output": "default"}\n\`\`\``
                },
                {
                    role: 'user',
                    content: `{"input": "What is AIGC?", "scenarios": ["user is asking about AI", "default"], "instruction": "Your task is to check and see if user is asking topic about AI"}`
                },
                {
                    role: 'assistant',
                    content: `\`\`\`json\n{"output": "user is asking about AI"}\n\`\`\``
                },
                {
                    role: 'user',
                    content: `{"input": "Can you explain deep learning?", "scenarios": ["user is interested in AI topics", "default"], "instruction": "Determine if the user is interested in learning about AI"}`
                },
                {
                    role: 'assistant',
                    content: `\`\`\`json\n{"output": "user is interested in AI topics"}\n\`\`\``
                }
            ]
            // Use to store messages with image file references as we do not want to store the base64 data into database
            let runtimeImageMessagesWithFileRef: BaseMessageLike[] = []
            // Use to keep track of past messages with image file references
            let pastImageMessagesWithFileRef: BaseMessageLike[] = []

            input = `{"input": ${input}, "scenarios": ${JSON.stringify(
                _conditionAgentScenarios.map((scenario) => scenario.scenario)
            )}, "instruction": ${conditionAgentInstructions}}`

            // Handle memory management if enabled
            if (enableMemory) {
                await this.handleMemory({
                    messages,
                    memoryType,
                    pastChatHistory,
                    runtimeChatHistory,
                    llmNodeInstance,
                    nodeData,
                    input,
                    abortController,
                    options,
                    modelConfig,
                    runtimeImageMessagesWithFileRef,
                    pastImageMessagesWithFileRef
                })
            } else {
                /*
                 * If this is the first node:
                 * - Add images to messages if exist
                 */
                if (!runtimeChatHistory.length && options.uploads) {
                    const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                    if (imageContents) {
                        const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                        messages.push(imageMessageWithBase64)
                        runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                    }
                }
                messages.push({
                    role: 'user',
                    content: input
                })
            }

            // Initialize response and determine if streaming is possible
            let response: AIMessageChunk = new AIMessageChunk('')

            // Start analytics
            if (analyticHandlers && options.parentTraceIds) {
                const llmLabel = options?.componentNodes?.[model]?.label || model
                llmIds = await analyticHandlers.onLLMStart(llmLabel, messages, options.parentTraceIds)
            }

            // Track execution time
            const startTime = Date.now()

            response = await llmNodeInstance.invoke(messages, { signal: abortController?.signal })

            // Calculate execution time
            const endTime = Date.now()
            const timeDelta = endTime - startTime

            // End analytics tracking
            if (analyticHandlers && llmIds) {
                await analyticHandlers.onLLMEnd(
                    llmIds,
                    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
                )
            }

            let calledOutputName = 'default'
            try {
                const parsedResponse = this.parseJsonMarkdown(response.content as string)
                if (!parsedResponse.output) {
                    throw new Error('Отсутствует ключ "output" в ответе')
                }
                calledOutputName = parsedResponse.output
            } catch (error) {
                console.warn(`Не удалось разобрать ответ LLM: ${error}. Используется выход по умолчанию.`)
            }

            // Clean up empty inputs
            for (const key in nodeData.inputs) {
                if (nodeData.inputs[key] === '') {
                    delete nodeData.inputs[key]
                }
            }

            // Find the first exact match
            const matchedScenarioIndex = _conditionAgentScenarios.findIndex(
                (scenario) => calledOutputName.toLowerCase() === scenario.scenario.toLowerCase()
            )

            const conditions = _conditionAgentScenarios.map((scenario, index) => {
                return {
                    output: scenario.scenario,
                    isFulfilled: index === matchedScenarioIndex
                }
            })

            // Replace the actual messages array with one that includes the file references for images instead of base64 data
            const messagesWithFileReferences = replaceBase64ImagesWithFileReferences(
                messages,
                runtimeImageMessagesWithFileRef,
                pastImageMessagesWithFileRef
            )

            // Only add to runtime chat history if this is the first node
            const inputMessages = []
            if (!runtimeChatHistory.length) {
                if (runtimeImageMessagesWithFileRef.length) {
                    inputMessages.push(...runtimeImageMessagesWithFileRef)
                }
                if (input && typeof input === 'string') {
                    inputMessages.push({ role: 'user', content: question })
                }
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: { messages: messagesWithFileReferences },
                output: {
                    conditions,
                    content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
                    timeMetadata: {
                        start: startTime,
                        end: endTime,
                        delta: timeDelta
                    }
                },
                state,
                chatHistory: [...inputMessages]
            }

            return returnOutput
        } catch (error) {
            if (options.analyticHandlers && llmIds) {
                await options.analyticHandlers.onLLMError(llmIds, error instanceof Error ? error.message : String(error))
            }

            if (error instanceof Error && error.message === 'Aborted') {
                throw error
            }
            throw new Error(`Ошибка в узле Агент условий: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Handles memory management based on the specified memory type
     */
    private async handleMemory({
        messages,
        memoryType,
        pastChatHistory,
        runtimeChatHistory,
        llmNodeInstance,
        nodeData,
        input,
        abortController,
        options,
        modelConfig,
        runtimeImageMessagesWithFileRef,
        pastImageMessagesWithFileRef
    }: {
        messages: BaseMessageLike[]
        memoryType: string
        pastChatHistory: BaseMessageLike[]
        runtimeChatHistory: BaseMessageLike[]
        llmNodeInstance: BaseChatModel
        nodeData: INodeData
        input: string
        abortController: AbortController
        options: ICommonObject
        modelConfig: ICommonObject
        runtimeImageMessagesWithFileRef: BaseMessageLike[]
        pastImageMessagesWithFileRef: BaseMessageLike[]
    }): Promise<void> {
        const { updatedPastMessages, transformedPastMessages } = await getPastChatHistoryImageMessages(pastChatHistory, options)
        pastChatHistory = updatedPastMessages
        pastImageMessagesWithFileRef.push(...transformedPastMessages)

        let pastMessages = [...pastChatHistory, ...runtimeChatHistory]
        if (!runtimeChatHistory.length) {
            /*
             * If this is the first node:
             * - Add images to messages if exist
             */
            if (options.uploads) {
                const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
                if (imageContents) {
                    const { imageMessageWithBase64, imageMessageWithFileRef } = imageContents
                    pastMessages.push(imageMessageWithBase64)
                    runtimeImageMessagesWithFileRef.push(imageMessageWithFileRef)
                }
            }
        }
        const { updatedMessages, transformedMessages } = await processMessagesWithImages(pastMessages, options)
        pastMessages = updatedMessages
        pastImageMessagesWithFileRef.push(...transformedMessages)

        if (pastMessages.length > 0) {
            if (memoryType === 'windowSize') {
                // Window memory: Keep the last N messages
                const windowSize = nodeData.inputs?.conditionAgentMemoryWindowSize as number
                const windowedMessages = pastMessages.slice(-windowSize * 2)
                messages.push(...windowedMessages)
            } else if (memoryType === 'conversationSummary') {
                // Summary memory: Summarize all past messages
                const summary = await llmNodeInstance.invoke(
                    [
                        {
                            role: 'user',
                            content: DEFAULT_SUMMARIZER_TEMPLATE.replace(
                                '{conversation}',
                                pastMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
                            )
                        }
                    ],
                    { signal: abortController?.signal }
                )
                messages.push({ role: 'assistant', content: summary.content as string })
            } else if (memoryType === 'conversationSummaryBuffer') {
                // Summary buffer: Summarize messages that exceed token limit
                await this.handleSummaryBuffer(messages, pastMessages, llmNodeInstance, nodeData, abortController)
            } else {
                // Default: Use all messages
                messages.push(...pastMessages)
            }
        }

        messages.push({
            role: 'user',
            content: input
        })
    }

    /**
     * Handles conversation summary buffer memory type
     */
    private async handleSummaryBuffer(
        messages: BaseMessageLike[],
        pastMessages: BaseMessageLike[],
        llmNodeInstance: BaseChatModel,
        nodeData: INodeData,
        abortController: AbortController
    ): Promise<void> {
        const maxTokenLimit = (nodeData.inputs?.conditionAgentMemoryMaxTokenLimit as number) || 2000

        // Convert past messages to a format suitable for token counting
        const messagesString = pastMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
        const tokenCount = await llmNodeInstance.getNumTokens(messagesString)

        if (tokenCount > maxTokenLimit) {
            // Calculate how many messages to summarize (messages that exceed the token limit)
            let currBufferLength = tokenCount
            const messagesToSummarize = []
            const remainingMessages = [...pastMessages]

            // Remove messages from the beginning until we're under the token limit
            while (currBufferLength > maxTokenLimit && remainingMessages.length > 0) {
                const poppedMessage = remainingMessages.shift()
                if (poppedMessage) {
                    messagesToSummarize.push(poppedMessage)
                    // Recalculate token count for remaining messages
                    const remainingMessagesString = remainingMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
                    currBufferLength = await llmNodeInstance.getNumTokens(remainingMessagesString)
                }
            }

            // Summarize the messages that were removed
            const messagesToSummarizeString = messagesToSummarize.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')

            const summary = await llmNodeInstance.invoke(
                [
                    {
                        role: 'user',
                        content: DEFAULT_SUMMARIZER_TEMPLATE.replace('{conversation}', messagesToSummarizeString)
                    }
                ],
                { signal: abortController?.signal }
            )

            // Add summary as a system message at the beginning, then add remaining messages
            messages.push({ role: 'system', content: `Previous conversation summary: ${summary.content}` })
            messages.push(...remainingMessages)
        } else {
            // If under token limit, use all messages
            messages.push(...pastMessages)
        }
    }
}

module.exports = { nodeClass: ConditionAgent_Agentflow }
