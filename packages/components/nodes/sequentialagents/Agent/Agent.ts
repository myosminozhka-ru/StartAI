import { flatten, uniq } from 'lodash'
import { DataSource } from 'typeorm'
import { RunnableSequence, RunnablePassthrough, RunnableConfig } from '@langchain/core/runnables'
import { ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate, BaseMessagePromptTemplateLike } from '@langchain/core/prompts'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { formatToOpenAIToolMessages } from 'langchain/agents/format_scratchpad/openai_tools'
import { type ToolsAgentStep } from 'langchain/agents/openai/output_parser'
import { StringOutputParser } from '@langchain/core/output_parsers'
import {
    INode,
    INodeData,
    INodeParams,
    ISeqAgentsState,
    ICommonObject,
    MessageContentImageUrl,
    INodeOutputsValue,
    ISeqAgentNode,
    IDatabaseEntity,
    IUsedTool,
    IDocument,
    IStateWithMessages,
    ConversationHistorySelection
} from '../../../src/Interface'
import {
    ToolCallingAgentOutputParser,
    AgentExecutor,
    SOURCE_DOCUMENTS_PREFIX,
    ARTIFACTS_PREFIX,
    TOOL_ARGS_PREFIX
} from '../../../src/agents'
import {
    extractOutputFromArray,
    getInputVariables,
    getVars,
    handleEscapeCharacters,
    prepareSandboxVars,
    removeInvalidImageMarkdown,
    transformBracesWithColon,
    executeJavaScriptCode,
    createCodeExecutionSandbox
} from '../../../src/utils'
import {
    customGet,
    processImageMessage,
    transformObjectPropertyToFunction,
    filterConversationHistory,
    restructureMessages,
    MessagesState,
    RunnableCallable,
    checkMessageHistory
} from '../commonUtils'
import { END, StateGraph } from '@langchain/langgraph'
import { StructuredTool } from '@langchain/core/tools'

const defaultApprovalPrompt = `You are about to execute tool: {tools}. Ask if user want to proceed`
const examplePrompt = 'You are a research assistant who can search for up-to-date info using search engine.'
const customOutputFuncDesc = `This is only applicable when you have a custom State at the START node. After agent execution, you might want to update the State values`
const howToUseCode = `
1. Return the key value JSON object. For example: if you have the following State:
    \`\`\`json
    {
        "user": null
    }
    \`\`\`

    You can update the "user" value by returning the following:
    \`\`\`js
    return {
        "user": "john doe"
    }
    \`\`\`

2. If you want to use the agent's output as the value to update state, it is available as \`$flow.output\` with the following structure:
    \`\`\`json
    {
        "content": "Hello! How can I assist you today?",
        "usedTools": [
            {
                "tool": "tool-name",
                "toolInput": "{foo: var}",
                "toolOutput": "This is the tool's output"
            }
        ],
        "sourceDocuments": [
            {
                "pageContent": "This is the page content",
                "metadata": "{foo: var}"
            }
        ]
    }
    \`\`\`

    For example, if the \`toolOutput\` is the value you want to update the state with, you can return the following:
    \`\`\`js
    return {
        "user": $flow.output.usedTools[0].toolOutput
    }
    \`\`\`

3. You can also get default flow config, including the current "state":
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

4. You can get custom variables: \`$vars.<variable-name>\`

`
const howToUse = `
1. Key and value pair to be updated. For example: if you have the following State:
    | Key       | Operation     | Default Value     |
    |-----------|---------------|-------------------|
    | user      | Replace       |                   |

    You can update the "user" value with the following:
    | Key       | Value     |
    |-----------|-----------|
    | user      | john doe  |

2. If you want to use the Agent's output as the value to update state, it is available as available as \`$flow.output\` with the following structure:
    \`\`\`json
    {
        "content": "Hello! How can I assist you today?",
        "usedTools": [
            {
                "tool": "tool-name",
                "toolInput": "{foo: var}",
                "toolOutput": "This is the tool's output"
            }
        ],
        "sourceDocuments": [
            {
                "pageContent": "This is the page content",
                "metadata": "{foo: var}"
            }
        ]
    }
    \`\`\`

    For example, if the \`toolOutput\` is the value you want to update the state with, you can do the following:
    | Key       | Value                                     |
    |-----------|-------------------------------------------|
    | user      | \`$flow.output.usedTools[0].toolOutput\`  |

3. You can get default flow config, including the current "state":
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

4. You can get custom variables: \`$vars.<variable-name>\`

`
const defaultFunc = `const result = $flow.output;

/* Suppose we have a custom State schema like this:
* {
    aggregate: {
        value: (x, y) => x.concat(y),
        default: () => []
    }
  }
*/

return {
  aggregate: [result.content]
};`

const messageHistoryExample = `const { AIMessage, HumanMessage, ToolMessage } = require('@langchain/core/messages');

return [
    new HumanMessage("What is 333382 🦜 1932?"),
    new AIMessage({
        content: "",
        tool_calls: [
        {
            id: "12345",
            name: "calulator",
            args: {
                number1: 333382,
                number2: 1932,
                operation: "divide",
            },
        },
        ],
    }),
    new ToolMessage({
        tool_call_id: "12345",
        content: "The answer is 172.558.",
    }),
    new AIMessage("The answer is 172.558."),
]`
const TAB_IDENTIFIER = 'selectedUpdateStateMemoryTab'

class Agent_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]
    badge?: string
    documentation?: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Агент'
        this.name = 'seqAgent'
        this.version = 4.1
        this.type = 'Agent'
        this.icon = 'seqAgent.png'
        this.category = 'Sequential Agents'
        this.description = 'Агент, который может выполнять инструменты'
        this.baseClasses = [this.type]
        this.documentation = 'https://docs.flowiseai.com/using-flowise/agentflows/sequential-agents#id-4.-agent-node'
        this.inputs = [
            {
                label: 'Название агента',
                name: 'agentName',
                type: 'string',
                placeholder: 'Agent'
            },
            {
                label: 'Системный промпт',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                optional: true,
                default: examplePrompt
            },
            {
                label: 'Предварительная история сообщений',
                name: 'messageHistory',
                description:
                    'Предварительно добавить список сообщений между системным промптом и человеческим промптом. Это полезно, когда вы хотите предоставить несколько примеров',
                type: 'code',
                hideCodeExecute: true,
                codeExample: messageHistoryExample,
                optional: true,
                additionalParams: true
            },
            {
                label: 'История разговора',
                name: 'conversationHistorySelection',
                type: 'options',
                options: [
                    {
                        label: 'Вопрос пользователя',
                        name: 'user_question',
                        description: 'Использовать вопрос пользователя из исторических сообщений разговора как входные данные.'
                    },
                    {
                        label: 'Последнее сообщение разговора',
                        name: 'last_message',
                        description: 'Использовать последнее сообщение разговора из исторических сообщений разговора как входные данные.'
                    },
                    {
                        label: 'Все сообщения разговора',
                        name: 'all_messages',
                        description: 'Использовать все сообщения разговора из исторических сообщений разговора как входные данные.'
                    },
                    {
                        label: 'Пусто',
                        name: 'empty',
                        description:
                            'Не использовать никакие сообщения из истории разговора. ' +
                            'Убедитесь, что используете либо системный промпт, либо человеческий промпт, либо историю сообщений.'
                    }
                ],
                default: 'all_messages',
                optional: true,
                description:
                    'Выберите, какие сообщения из истории разговора включить в промпт. ' +
                    'Выбранные сообщения будут вставлены между системным промптом (если определен) и ' +
                    '[Историей сообщений, Человеческим промптом].',
                additionalParams: true
            },
            {
                label: 'Человеческий промпт',
                name: 'humanMessagePrompt',
                type: 'string',
                description: 'Этот промпт будет добавлен в конец сообщений как человеческое сообщение',
                rows: 4,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Инструменты',
                name: 'tools',
                type: 'Tool',
                list: true,
                optional: true
            },
            {
                label: 'Последовательный узел',
                name: 'sequentialNode',
                type: 'Start | Agent | Condition | LLMNode | ToolNode | CustomFunction | ExecuteFlow',
                description:
                    'Может быть подключен к одному из следующих узлов: Start, Agent, Condition, LLM Node, Tool Node, Custom Function, Execute Flow',
                list: true
            },
            {
                label: 'Чат модель',
                name: 'model',
                type: 'BaseChatModel',
                optional: true,
                description: `Переопределить модель для использования этим агентом`
            },
            {
                label: 'Требовать одобрения',
                name: 'interrupt',
                description:
                    'Приостановить выполнение и запросить одобрение пользователя перед запуском инструментов.\n' +
                    'Если включено, агент будет запрашивать у пользователя настраиваемые варианты одобрения/отклонения\n' +
                    'и будет продолжать только после одобрения. Это требует настроенной памяти агента для управления\n' +
                    'состоянием и обработки запросов на одобрение.\n' +
                    'Если инструменты не вызываются, агент продолжает без прерывания.',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Форматировать значения промпта',
                name: 'promptValues',
                description:
                    'Назначить значения переменным промпта. Вы также можете использовать $flow.state.<имя-переменной> для получения значения состояния',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            },
            {
                label: 'Промпт одобрения',
                name: 'approvalPrompt',
                description: 'Промпт для одобрения. Применимо только если включено "Требовать одобрения"',
                type: 'string',
                default: defaultApprovalPrompt,
                rows: 4,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Текст кнопки одобрения',
                name: 'approveButtonText',
                description: 'Текст для кнопки одобрения. Применимо только если включено "Требовать одобрения"',
                type: 'string',
                default: 'Yes',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Текст кнопки отклонения',
                name: 'rejectButtonText',
                description: 'Текст для кнопки отклонения. Применимо только если включено "Требовать одобрения"',
                type: 'string',
                default: 'No',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Обновить состояние',
                name: 'updateStateMemory',
                type: 'tabs',
                tabIdentifier: TAB_IDENTIFIER,
                additionalParams: true,
                default: 'updateStateMemoryUI',
                tabs: [
                    {
                        label: 'Обновить состояние (Таблица)',
                        name: 'updateStateMemoryUI',
                        type: 'datagrid',
                        hint: {
                            label: 'Как использовать',
                            value: howToUse
                        },
                        description: customOutputFuncDesc,
                        datagrid: [
                            {
                                field: 'key',
                                headerName: 'Ключ',
                                type: 'asyncSingleSelect',
                                loadMethod: 'loadStateKeys',
                                flex: 0.5,
                                editable: true
                            },
                            {
                                field: 'value',
                                headerName: 'Значение',
                                type: 'freeSolo',
                                valueOptions: [
                                    {
                                        label: 'Вывод агента (строка)',
                                        value: '$flow.output.content'
                                    },
                                    {
                                        label: `Использованные инструменты (массив)`,
                                        value: '$flow.output.usedTools'
                                    },
                                    {
                                        label: `Первый вывод инструмента (строка)`,
                                        value: '$flow.output.usedTools[0].toolOutput'
                                    },
                                    {
                                        label: 'Исходные документы (массив)',
                                        value: '$flow.output.sourceDocuments'
                                    },
                                    {
                                        label: `Глобальная переменная (строка)`,
                                        value: '$vars.<имя-переменной>'
                                    },
                                    {
                                        label: 'Входной вопрос (строка)',
                                        value: '$flow.input'
                                    },
                                    {
                                        label: 'ID сессии (строка)',
                                        value: '$flow.sessionId'
                                    },
                                    {
                                        label: 'ID чата (строка)',
                                        value: '$flow.chatId'
                                    },
                                    {
                                        label: 'ID потока чата (строка)',
                                        value: '$flow.chatflowId'
                                    }
                                ],
                                editable: true,
                                flex: 1
                            }
                        ],
                        optional: true,
                        additionalParams: true
                    },
                    {
                        label: 'Обновить состояние (Код)',
                        name: 'updateStateMemoryCode',
                        type: 'code',
                        hint: {
                            label: 'Как использовать',
                            value: howToUseCode
                        },
                        description: `${customOutputFuncDesc}. Должен возвращать объект, представляющий состояние`,
                        hideCodeExecute: true,
                        codeExample: defaultFunc,
                        optional: true,
                        additionalParams: true
                    }
                ]
            },
            {
                label: 'Максимум итераций',
                name: 'maxIterations',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        let tools = nodeData.inputs?.tools
        tools = flatten(tools)
        let agentSystemPrompt = nodeData.inputs?.systemMessagePrompt as string
        agentSystemPrompt = transformBracesWithColon(agentSystemPrompt)
        let agentHumanPrompt = nodeData.inputs?.humanMessagePrompt as string
        agentHumanPrompt = transformBracesWithColon(agentHumanPrompt)
        const agentLabel = nodeData.inputs?.agentName as string
        const sequentialNodes = nodeData.inputs?.sequentialNode as ISeqAgentNode[]
        const maxIterations = nodeData.inputs?.maxIterations as string
        const model = nodeData.inputs?.model as BaseChatModel
        const promptValuesStr = nodeData.inputs?.promptValues
        const output = nodeData.outputs?.output as string
        const approvalPrompt = nodeData.inputs?.approvalPrompt as string

        if (!agentLabel) throw new Error('Agent name is required!')
        const agentName = agentLabel.toLowerCase().replace(/\s/g, '_').trim()

        if (!sequentialNodes || !sequentialNodes.length) throw new Error('Agent must have a predecessor!')

        let agentInputVariablesValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                agentInputVariablesValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the Agent's Prompt Input Values: " + exception)
            }
        }
        agentInputVariablesValues = handleEscapeCharacters(agentInputVariablesValues, true)

        const startLLM = sequentialNodes[0].startLLM
        const llm = model || startLLM
        if (nodeData.inputs) nodeData.inputs.model = llm

        const multiModalMessageContent = sequentialNodes[0]?.multiModalMessageContent || (await processImageMessage(llm, nodeData, options))
        const abortControllerSignal = options.signal as AbortController
        const agentInputVariables = uniq([...getInputVariables(agentSystemPrompt), ...getInputVariables(agentHumanPrompt)])

        if (!agentInputVariables.every((element) => Object.keys(agentInputVariablesValues).includes(element))) {
            throw new Error('Agent input variables values are not provided!')
        }

        const interrupt = nodeData.inputs?.interrupt as boolean

        const toolName = `tool_${nodeData.id}`
        const toolNode = new ToolNode(tools, nodeData, input, options, toolName, [], { sequentialNodeName: toolName })

        ;(toolNode as any).seekPermissionMessage = async (usedTools: IUsedTool[]) => {
            const prompt = ChatPromptTemplate.fromMessages([['human', approvalPrompt || defaultApprovalPrompt]])
            const chain = prompt.pipe(startLLM)
            const response = (await chain.invoke({
                input: 'Hello there!',
                tools: JSON.stringify(usedTools)
            })) as AIMessageChunk
            return response.content
        }

        const workerNode = async (state: ISeqAgentsState, config: RunnableConfig) => {
            return await agentNode(
                {
                    state,
                    llm,
                    interrupt,
                    agent: await createAgent(
                        nodeData,
                        options,
                        agentName,
                        state,
                        llm,
                        interrupt,
                        [...tools],
                        agentSystemPrompt,
                        agentHumanPrompt,
                        multiModalMessageContent,
                        agentInputVariablesValues,
                        maxIterations,
                        {
                            sessionId: options.sessionId,
                            chatId: options.chatId,
                            input
                        }
                    ),
                    name: agentName,
                    abortControllerSignal,
                    nodeData,
                    input,
                    options
                },
                config
            )
        }

        const toolInterrupt = async (
            graph: StateGraph<any>,
            nextNodeName?: string,
            runCondition?: any,
            conditionalMapping: ICommonObject = {}
        ) => {
            const routeMessage = async (state: ISeqAgentsState) => {
                const messages = state.messages as unknown as BaseMessage[]
                const lastMessage = messages[messages.length - 1] as AIMessage

                if (!lastMessage?.tool_calls?.length) {
                    // if next node is condition node, run the condition
                    if (runCondition) {
                        const returnNodeName = await runCondition(state)
                        return returnNodeName
                    }
                    return nextNodeName || END
                }
                return toolName
            }

            graph.addNode(toolName, toolNode)

            if (nextNodeName) {
                // @ts-ignore
                graph.addConditionalEdges(agentName, routeMessage, {
                    [toolName]: toolName,
                    [END]: END,
                    [nextNodeName]: nextNodeName,
                    ...conditionalMapping
                })
            } else {
                // @ts-ignore
                graph.addConditionalEdges(agentName, routeMessage, { [toolName]: toolName, [END]: END, ...conditionalMapping })
            }

            // @ts-ignore
            graph.addEdge(toolName, agentName)

            return graph
        }

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: workerNode,
            name: agentName,
            label: agentLabel,
            type: 'agent',
            llm,
            startLLM,
            output,
            predecessorAgents: sequentialNodes,
            multiModalMessageContent,
            moderations: sequentialNodes[0]?.moderations,
            agentInterruptToolNode: interrupt ? toolNode : undefined,
            agentInterruptToolFunc: interrupt ? toolInterrupt : undefined
        }

        return returnOutput
    }
}

async function createAgent(
    nodeData: INodeData,
    options: ICommonObject,
    agentName: string,
    state: ISeqAgentsState,
    llm: BaseChatModel,
    interrupt: boolean,
    tools: any[],
    systemPrompt: string,
    humanPrompt: string,
    multiModalMessageContent: MessageContentImageUrl[],
    agentInputVariablesValues: ICommonObject,
    maxIterations?: string,
    flowObj?: { sessionId?: string; chatId?: string; input?: string }
): Promise<any> {
    if (tools.length && !interrupt) {
        const promptArrays = [
            new MessagesPlaceholder('messages'),
            new MessagesPlaceholder('agent_scratchpad')
        ] as BaseMessagePromptTemplateLike[]
        if (systemPrompt) promptArrays.unshift(['system', systemPrompt])
        if (humanPrompt) promptArrays.push(['human', humanPrompt])

        let prompt = ChatPromptTemplate.fromMessages(promptArrays)
        prompt = await checkMessageHistory(nodeData, options, prompt, promptArrays, systemPrompt)

        if (multiModalMessageContent.length) {
            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])
            prompt.promptMessages.splice(1, 0, msg)
        }

        if (llm.bindTools === undefined) {
            throw new Error(`This agent only compatible with function calling models.`)
        }
        const modelWithTools = llm.bindTools(tools)

        let agent

        if (!agentInputVariablesValues || !Object.keys(agentInputVariablesValues).length) {
            agent = RunnableSequence.from([
                RunnablePassthrough.assign({
                    //@ts-ignore
                    agent_scratchpad: (input: { steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(input.steps)
                }),
                prompt,
                modelWithTools,
                new ToolCallingAgentOutputParser()
            ]).withConfig({
                metadata: { sequentialNodeName: agentName }
            })
        } else {
            agent = RunnableSequence.from([
                RunnablePassthrough.assign({
                    //@ts-ignore
                    agent_scratchpad: (input: { steps: ToolsAgentStep[] }) => formatToOpenAIToolMessages(input.steps)
                }),
                RunnablePassthrough.assign(transformObjectPropertyToFunction(agentInputVariablesValues, state)),
                prompt,
                modelWithTools,
                new ToolCallingAgentOutputParser()
            ]).withConfig({
                metadata: { sequentialNodeName: agentName }
            })
        }

        const executor = AgentExecutor.fromAgentAndTools({
            agent,
            tools,
            sessionId: flowObj?.sessionId,
            chatId: flowObj?.chatId,
            input: flowObj?.input,
            verbose: process.env.DEBUG === 'true',
            maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
        })
        return executor
    } else if (tools.length && interrupt) {
        if (llm.bindTools === undefined) {
            throw new Error(`Agent Node only compatible with function calling models.`)
        }
        // @ts-ignore
        llm = llm.bindTools(tools)

        const promptArrays = [new MessagesPlaceholder('messages')] as BaseMessagePromptTemplateLike[]
        if (systemPrompt) promptArrays.unshift(['system', systemPrompt])
        if (humanPrompt) promptArrays.push(['human', humanPrompt])

        let prompt = ChatPromptTemplate.fromMessages(promptArrays)
        prompt = await checkMessageHistory(nodeData, options, prompt, promptArrays, systemPrompt)

        if (multiModalMessageContent.length) {
            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])
            prompt.promptMessages.splice(1, 0, msg)
        }

        let agent

        if (!agentInputVariablesValues || !Object.keys(agentInputVariablesValues).length) {
            agent = RunnableSequence.from([prompt, llm]).withConfig({
                metadata: { sequentialNodeName: agentName }
            })
        } else {
            agent = RunnableSequence.from([
                RunnablePassthrough.assign(transformObjectPropertyToFunction(agentInputVariablesValues, state)),
                prompt,
                llm
            ]).withConfig({
                metadata: { sequentialNodeName: agentName }
            })
        }
        return agent
    } else {
        const promptArrays = [new MessagesPlaceholder('messages')] as BaseMessagePromptTemplateLike[]
        if (systemPrompt) promptArrays.unshift(['system', systemPrompt])
        if (humanPrompt) promptArrays.push(['human', humanPrompt])

        let prompt = ChatPromptTemplate.fromMessages(promptArrays)
        prompt = await checkMessageHistory(nodeData, options, prompt, promptArrays, systemPrompt)

        if (multiModalMessageContent.length) {
            const msg = HumanMessagePromptTemplate.fromTemplate([...multiModalMessageContent])
            prompt.promptMessages.splice(1, 0, msg)
        }

        let conversationChain

        if (!agentInputVariablesValues || !Object.keys(agentInputVariablesValues).length) {
            conversationChain = RunnableSequence.from([prompt, llm, new StringOutputParser()]).withConfig({
                metadata: { sequentialNodeName: agentName }
            })
        } else {
            conversationChain = RunnableSequence.from([
                RunnablePassthrough.assign(transformObjectPropertyToFunction(agentInputVariablesValues, state)),
                prompt,
                llm,
                new StringOutputParser()
            ]).withConfig({
                metadata: { sequentialNodeName: agentName }
            })
        }

        return conversationChain
    }
}

async function agentNode(
    {
        state,
        llm,
        interrupt,
        agent,
        name,
        abortControllerSignal,
        nodeData,
        input,
        options
    }: {
        state: ISeqAgentsState
        llm: BaseChatModel
        interrupt: boolean
        agent: AgentExecutor | RunnableSequence
        name: string
        abortControllerSignal: AbortController
        nodeData: INodeData
        input: string
        options: ICommonObject
    },
    config: RunnableConfig
) {
    try {
        if (abortControllerSignal.signal.aborted) {
            throw new Error('Aborted!')
        }

        const historySelection = (nodeData.inputs?.conversationHistorySelection || 'all_messages') as ConversationHistorySelection
        // @ts-ignore
        state.messages = filterConversationHistory(historySelection, input, state)
        // @ts-ignore
        state.messages = restructureMessages(llm, state)

        let result = await agent.invoke({ ...state, signal: abortControllerSignal.signal }, config)

        if (interrupt) {
            const messages = state.messages as unknown as BaseMessage[]
            const lastMessage = messages.length ? messages[messages.length - 1] : null

            // If the last message is a tool message and is an interrupted message, format output into standard agent output
            if (lastMessage && lastMessage._getType() === 'tool' && lastMessage.additional_kwargs?.nodeId === nodeData.id) {
                let formattedAgentResult: {
                    output?: string
                    usedTools?: IUsedTool[]
                    sourceDocuments?: IDocument[]
                    artifacts?: ICommonObject[]
                } = {}
                formattedAgentResult.output = result.content
                if (lastMessage.additional_kwargs?.usedTools) {
                    formattedAgentResult.usedTools = lastMessage.additional_kwargs.usedTools as IUsedTool[]
                }
                if (lastMessage.additional_kwargs?.sourceDocuments) {
                    formattedAgentResult.sourceDocuments = lastMessage.additional_kwargs.sourceDocuments as IDocument[]
                }
                if (lastMessage.additional_kwargs?.artifacts) {
                    formattedAgentResult.artifacts = lastMessage.additional_kwargs.artifacts as ICommonObject[]
                }
                result = formattedAgentResult
            } else {
                result.name = name
                result.additional_kwargs = { ...result.additional_kwargs, nodeId: nodeData.id, interrupt: true }
                return {
                    messages: [result]
                }
            }
        }

        const additional_kwargs: ICommonObject = { nodeId: nodeData.id }

        if (result.usedTools) {
            additional_kwargs.usedTools = result.usedTools
        }
        if (result.sourceDocuments) {
            additional_kwargs.sourceDocuments = result.sourceDocuments
        }
        if (result.artifacts) {
            additional_kwargs.artifacts = result.artifacts
        }
        if (result.output) {
            result.content = result.output
            delete result.output
        }

        let outputContent = typeof result === 'string' ? result : result.content || result.output
        outputContent = extractOutputFromArray(outputContent)
        outputContent = removeInvalidImageMarkdown(outputContent)

        if (nodeData.inputs?.updateStateMemoryUI || nodeData.inputs?.updateStateMemoryCode) {
            let formattedOutput = {
                ...result,
                content: outputContent
            }
            const returnedOutput = await getReturnOutput(nodeData, input, options, formattedOutput, state)
            return {
                ...returnedOutput,
                messages: convertCustomMessagesToBaseMessages([outputContent], name, additional_kwargs)
            }
        } else {
            return {
                messages: [
                    new HumanMessage({
                        content: outputContent,
                        name,
                        additional_kwargs: Object.keys(additional_kwargs).length ? additional_kwargs : undefined
                    })
                ]
            }
        }
    } catch (error) {
        throw new Error(error)
    }
}

const getReturnOutput = async (nodeData: INodeData, input: string, options: ICommonObject, output: any, state: ISeqAgentsState) => {
    const appDataSource = options.appDataSource as DataSource
    const databaseEntities = options.databaseEntities as IDatabaseEntity
    const tabIdentifier = nodeData.inputs?.[`${TAB_IDENTIFIER}_${nodeData.id}`] as string
    const updateStateMemoryUI = nodeData.inputs?.updateStateMemoryUI as string
    const updateStateMemoryCode = nodeData.inputs?.updateStateMemoryCode as string
    const updateStateMemory = nodeData.inputs?.updateStateMemory as string

    const selectedTab = tabIdentifier ? tabIdentifier.split(`_${nodeData.id}`)[0] : 'updateStateMemoryUI'
    const variables = await getVars(appDataSource, databaseEntities, nodeData, options)

    const flow = {
        chatflowId: options.chatflowid,
        sessionId: options.sessionId,
        chatId: options.chatId,
        input,
        output,
        state,
        vars: prepareSandboxVars(variables)
    }

    if (updateStateMemory && updateStateMemory !== 'updateStateMemoryUI' && updateStateMemory !== 'updateStateMemoryCode') {
        try {
            const parsedSchema = typeof updateStateMemory === 'string' ? JSON.parse(updateStateMemory) : updateStateMemory
            const obj: ICommonObject = {}
            for (const sch of parsedSchema) {
                const key = sch.Key
                if (!key) throw new Error(`Key is required`)
                let value = sch.Value as string
                if (value.startsWith('$flow')) {
                    value = customGet(flow, sch.Value.replace('$flow.', ''))
                } else if (value.startsWith('$vars')) {
                    value = customGet(flow, sch.Value.replace('$', ''))
                }
                obj[key] = value
            }
            return obj
        } catch (e) {
            throw new Error(e)
        }
    }

    if (selectedTab === 'updateStateMemoryUI' && updateStateMemoryUI) {
        try {
            const parsedSchema = typeof updateStateMemoryUI === 'string' ? JSON.parse(updateStateMemoryUI) : updateStateMemoryUI
            const obj: ICommonObject = {}
            for (const sch of parsedSchema) {
                const key = sch.key
                if (!key) throw new Error(`Key is required`)
                let value = sch.value as string
                if (value.startsWith('$flow')) {
                    value = customGet(flow, sch.value.replace('$flow.', ''))
                } else if (value.startsWith('$vars')) {
                    value = customGet(flow, sch.value.replace('$', ''))
                }
                obj[key] = value
            }
            return obj
        } catch (e) {
            throw new Error(e)
        }
    } else if (selectedTab === 'updateStateMemoryCode' && updateStateMemoryCode) {
        const sandbox = createCodeExecutionSandbox(input, variables, flow)

        try {
            const response = await executeJavaScriptCode(updateStateMemoryCode, sandbox)

            if (typeof response !== 'object') throw new Error('Return output must be an object')
            return response
        } catch (e) {
            throw new Error(e)
        }
    }

    return {}
}

const convertCustomMessagesToBaseMessages = (messages: string[], name: string, additional_kwargs: ICommonObject) => {
    return messages.map((message) => {
        return new HumanMessage({
            content: message,
            name,
            additional_kwargs: Object.keys(additional_kwargs).length ? additional_kwargs : undefined
        })
    })
}

class ToolNode<T extends BaseMessage[] | MessagesState> extends RunnableCallable<T, T> {
    tools: StructuredTool[]
    nodeData: INodeData
    inputQuery: string
    options: ICommonObject

    constructor(
        tools: StructuredTool[],
        nodeData: INodeData,
        inputQuery: string,
        options: ICommonObject,
        name: string = 'tools',
        tags: string[] = [],
        metadata: ICommonObject = {}
    ) {
        super({ name, metadata, tags, func: (input, config) => this.run(input, config) })
        this.tools = tools
        this.nodeData = nodeData
        this.inputQuery = inputQuery
        this.options = options
    }

    private async run(input: BaseMessage[] | MessagesState, config: RunnableConfig): Promise<BaseMessage[] | MessagesState> {
        let messages: BaseMessage[]

        // Check if input is an array of BaseMessage[]
        if (Array.isArray(input)) {
            messages = input
        }
        // Check if input is IStateWithMessages
        else if ((input as IStateWithMessages).messages) {
            messages = (input as IStateWithMessages).messages
        }
        // Handle MessagesState type
        else {
            messages = (input as MessagesState).messages
        }

        // Get the last message
        const message = messages[messages.length - 1]

        if (message._getType() !== 'ai') {
            throw new Error('ToolNode only accepts AIMessages as input.')
        }

        // Extract all properties except messages for IStateWithMessages
        const { messages: _, ...inputWithoutMessages } = Array.isArray(input) ? { messages: input } : input
        const ChannelsWithoutMessages = {
            chatId: this.options.chatId,
            sessionId: this.options.sessionId,
            input: this.inputQuery,
            state: inputWithoutMessages
        }

        const outputs = await Promise.all(
            (message as AIMessage).tool_calls?.map(async (call) => {
                const tool = this.tools.find((tool) => tool.name === call.name)
                if (tool === undefined) {
                    throw new Error(`Tool ${call.name} not found.`)
                }
                if (tool && (tool as any).setFlowObject) {
                    // @ts-ignore
                    tool.setFlowObject(ChannelsWithoutMessages)
                }
                let output = await tool.invoke(call.args, config)
                let sourceDocuments: Document[] = []
                let artifacts = []

                if (output?.includes(SOURCE_DOCUMENTS_PREFIX)) {
                    const outputArray = output.split(SOURCE_DOCUMENTS_PREFIX)
                    output = outputArray[0]
                    const docs = outputArray[1]
                    try {
                        sourceDocuments = JSON.parse(docs)
                    } catch (e) {
                        console.error('Error parsing source documents from tool')
                    }
                }
                if (output?.includes(ARTIFACTS_PREFIX)) {
                    const outputArray = output.split(ARTIFACTS_PREFIX)
                    output = outputArray[0]
                    try {
                        artifacts = JSON.parse(outputArray[1])
                    } catch (e) {
                        console.error('Error parsing artifacts from tool')
                    }
                }

                let toolInput
                if (typeof output === 'string' && output.includes(TOOL_ARGS_PREFIX)) {
                    const outputArray = output.split(TOOL_ARGS_PREFIX)
                    output = outputArray[0]
                    try {
                        toolInput = JSON.parse(outputArray[1])
                    } catch (e) {
                        console.error('Error parsing tool input from tool')
                    }
                }

                return new ToolMessage({
                    name: tool.name,
                    content: typeof output === 'string' ? output : JSON.stringify(output),
                    tool_call_id: call.id!,
                    additional_kwargs: {
                        sourceDocuments,
                        artifacts,
                        args: toolInput ?? call.args,
                        usedTools: [
                            {
                                tool: tool.name ?? '',
                                toolInput: toolInput ?? call.args,
                                toolOutput: output
                            }
                        ]
                    }
                })
            }) ?? []
        )

        const additional_kwargs: ICommonObject = { nodeId: this.nodeData.id }
        outputs.forEach((result) => (result.additional_kwargs = { ...result.additional_kwargs, ...additional_kwargs }))
        return Array.isArray(input) ? outputs : { messages: outputs }
    }
}

module.exports = { nodeClass: Agent_SeqAgents }
