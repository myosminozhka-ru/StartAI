import { DataSource } from 'typeorm'
import { getVars, handleEscapeCharacters, executeJavaScriptCode, createCodeExecutionSandbox } from '../../../src/utils'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams, ISeqAgentNode, ISeqAgentsState } from '../../../src/Interface'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import { customGet } from '../commonUtils'

const howToUseCode = `
1. В конце функции обязательно должен быть возврат значения типа string.

2. Вы можете получить конфиг потока по умолчанию, включая текущий "state":
    - \`$flow.sessionId\`
    - \`$flow.chatId\`
    - \`$flow.chatflowId\`
    - \`$flow.input\`
    - \`$flow.state\`

3. Вы можете получить пользовательские переменные: \`$vars.<имя-переменной>\`

`

class CustomFunction_SeqAgents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Пользовательская JS функция'
        this.name = 'seqCustomFunction'
        this.version = 1.0
        this.type = 'CustomFunction'
        this.icon = 'customfunction.svg'
        this.category = 'Sequential Agents'
        this.description = `Выполнение пользовательской javascript функции`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Входные переменные',
                name: 'functionInputVariables',
                description: 'Входные переменные могут быть использованы в функции с префиксом $. Например: $var',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
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
                label: 'Имя функции',
                name: 'functionName',
                type: 'string',
                placeholder: 'Моя функция'
            },
            {
                label: 'Javascript функция',
                name: 'javascriptFunction',
                type: 'code',
                hint: {
                    label: 'Как использовать',
                    value: howToUseCode
                }
            },
            {
                label: 'Возвращаемое значение как',
                name: 'returnValueAs',
                type: 'options',
                options: [
                    { label: 'AI сообщение', name: 'aiMessage' },
                    { label: 'Сообщение пользователя', name: 'humanMessage' },
                    {
                        label: 'Объект состояния',
                        name: 'stateObj',
                        description:
                            "Вернуть как объект состояния, например: { foo: bar }. Это обновит пользовательское состояние 'foo' на 'bar'"
                    }
                ],
                default: 'aiMessage'
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const functionName = nodeData.inputs?.functionName as string
        const javascriptFunction = nodeData.inputs?.javascriptFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const sequentialNodes = nodeData.inputs?.sequentialNode as ISeqAgentNode[]
        const returnValueAs = nodeData.inputs?.returnValueAs as string

        if (!sequentialNodes || !sequentialNodes.length) throw new Error('У пользовательской функции должен быть предшествующий узел!')

        const executeFunc = async (state: ISeqAgentsState) => {
            const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
            const flow = {
                chatflowId: options.chatflowid,
                sessionId: options.sessionId,
                chatId: options.chatId,
                input,
                state
            }

            let inputVars: ICommonObject = {}
            if (functionInputVariablesRaw) {
                try {
                    inputVars =
                        typeof functionInputVariablesRaw === 'object' ? functionInputVariablesRaw : JSON.parse(functionInputVariablesRaw)
                } catch (exception) {
                    throw new Error('Некорректный JSON во входных переменных пользовательской функции: ' + exception)
                }
            }

            // Некоторые значения могут быть строкой в формате JSON, парсим их
            for (const key in inputVars) {
                let value = inputVars[key]
                if (typeof value === 'string') {
                    value = handleEscapeCharacters(value, true)
                    if (value.startsWith('{') && value.endsWith('}')) {
                        try {
                            value = JSON.parse(value)
                            const nodeId = value.id || ''
                            if (nodeId) {
                                const messages = state.messages as unknown as BaseMessage[]
                                const content = messages.find((msg) => msg.additional_kwargs?.nodeId === nodeId)?.content
                                if (content) {
                                    value = content
                                }
                            }
                        } catch (e) {
                            // игнорируем
                        }
                    }

                    if (value.startsWith('$flow.')) {
                        const variableValue = customGet(flow, value.replace('$flow.', ''))
                        if (variableValue) {
                            value = variableValue
                        }
                    } else if (value.startsWith('$vars')) {
                        value = customGet(flow, value.replace('$', ''))
                    }
                    inputVars[key] = value
                }
            }

            // Create additional sandbox variables
            const additionalSandbox: ICommonObject = {}

            // Add input variables to sandbox
            if (Object.keys(inputVars).length) {
                for (const item in inputVars) {
                    additionalSandbox[`$${item}`] = inputVars[item]
                }
            }

            const sandbox = createCodeExecutionSandbox(input, variables, flow, additionalSandbox)

            try {
                const response = await executeJavaScriptCode(javascriptFunction, sandbox)

                if (returnValueAs === 'stateObj') {
                    if (typeof response !== 'object') {
                        throw new Error('Пользовательская функция должна возвращать объект!')
                    }
                    return {
                        ...state,
                        ...response
                    }
                }

                if (typeof response !== 'string') {
                    throw new Error('Пользовательская функция должна возвращать строку!')
                }

                if (returnValueAs === 'humanMessage') {
                    return {
                        messages: [
                            new HumanMessage({
                                content: response,
                                additional_kwargs: {
                                    nodeId: nodeData.id
                                }
                            })
                        ]
                    }
                }

                return {
                    messages: [
                        new AIMessage({
                            content: response,
                            additional_kwargs: {
                                nodeId: nodeData.id
                            }
                        })
                    ]
                }
            } catch (e) {
                throw new Error(e)
            }
        }

        const startLLM = sequentialNodes[0].startLLM

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: executeFunc,
            name: functionName.toLowerCase().replace(/\s/g, '_').trim(),
            label: functionName,
            type: 'utilities',
            output: 'CustomFunction',
            llm: startLLM,
            startLLM,
            multiModalMessageContent: sequentialNodes[0]?.multiModalMessageContent,
            predecessorAgents: sequentialNodes
        }

        return returnOutput
    }
}

module.exports = { nodeClass: CustomFunction_SeqAgents }
