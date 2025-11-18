import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, transformBracesWithColon, getVars, executeJavaScriptCode, createCodeExecutionSandbox } from '../../../src/utils'
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { DataSource } from 'typeorm'
const defaultFunc = `const { AIMessage, HumanMessage, ToolMessage } = require('@langchain/core/messages');

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
const TAB_IDENTIFIER = 'selectedMessagesTab'

class ChatPromptTemplate_Prompts implements INode {
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
        this.label = 'Шаблон чат-промпта'
        this.name = 'chatPromptTemplate'
        this.version = 2.0
        this.type = 'ChatPromptTemplate'
        this.icon = 'prompt.svg'
        this.category = 'Prompts'
        this.description = 'Схема для представления чат-промпта'
        this.baseClasses = [this.type, ...getBaseClasses(ChatPromptTemplate)]
        this.inputs = [
            {
                label: 'Системное сообщение',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                placeholder: `You are a helpful assistant that translates {input_language} to {output_language}.`
            },
            {
                label: 'Человеческое сообщение',
                name: 'humanMessagePrompt',
                description: 'Этот промпт будет добавлен в конец сообщений как человеческое сообщение',
                type: 'string',
                rows: 4,
                placeholder: `{text}`
            },
            {
                label: 'Форматировать значения промпта',
                name: 'promptValues',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            },
            {
                label: 'История сообщений',
                name: 'messageHistory',
                description: 'Добавить сообщения после системного сообщения. Полезно, когда вы хотите предоставить несколько примеров',
                type: 'tabs',
                tabIdentifier: TAB_IDENTIFIER,
                additionalParams: true,
                default: 'messageHistoryCode',
                tabs: [
                    //TODO: add UI for messageHistory
                    {
                        label: 'Добавить сообщения (Код)',
                        name: 'messageHistoryCode',
                        type: 'code',
                        hideCodeExecute: true,
                        codeExample: defaultFunc,
                        optional: true,
                        additionalParams: true
                    }
                ]
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        let humanMessagePrompt = nodeData.inputs?.humanMessagePrompt as string
        const promptValuesStr = nodeData.inputs?.promptValues
        const tabIdentifier = nodeData.inputs?.[`${TAB_IDENTIFIER}_${nodeData.id}`] as string
        const selectedTab = tabIdentifier ? tabIdentifier.split(`_${nodeData.id}`)[0] : 'messageHistoryCode'
        const messageHistoryCode = nodeData.inputs?.messageHistoryCode
        const messageHistory = nodeData.inputs?.messageHistory

        systemMessagePrompt = transformBracesWithColon(systemMessagePrompt)
        humanMessagePrompt = transformBracesWithColon(humanMessagePrompt)

        let prompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
            HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
        ])

        if (
            (messageHistory && messageHistory === 'messageHistoryCode' && messageHistoryCode) ||
            (selectedTab === 'messageHistoryCode' && messageHistoryCode)
        ) {
            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
            const flow = {
                chatflowId: options.chatflowid,
                sessionId: options.sessionId,
                chatId: options.chatId
            }

            const sandbox = createCodeExecutionSandbox('', variables, flow)

            try {
                const response = await executeJavaScriptCode(messageHistoryCode, sandbox, {
                    libraries: ['axios', '@langchain/core']
                })

                // Если response уже массив объектов, используем его напрямую
                // Если это строка, пытаемся распарсить как JSON
                let parsedResponse: any
                
                // Сначала проверяем, не является ли response строкой с "[object ...]"
                if (typeof response === 'string') {
                    // Проверяем, не является ли это строковым представлением объекта ДО попытки парсинга
                    if (response.trim().startsWith('[object ') || 
                        response.includes('[object Hum') || 
                        response.includes('[object AIM') || 
                        response.includes('[object Tool')) {
                        throw new Error(`Invalid response: objects were converted to string representations (e.g., "${response.substring(0, 50)}..."). NodeVM cannot serialize Langchain message objects directly. Try returning a JSON stringified array of message objects, or use a different approach.`)
                    }
                    // Проверяем, является ли это валидным JSON перед парсингом
                    const trimmedResponse = response.trim()
                    if ((trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) || 
                        (trimmedResponse.startsWith('[') && trimmedResponse.endsWith(']'))) {
                        try {
                            parsedResponse = JSON.parse(response)
                        } catch (parseError) {
                            // Если ошибка парсинга связана с "[object ...]", выбросим понятное сообщение
                            if (parseError instanceof SyntaxError && parseError.message.includes('Unexpected token')) {
                                throw new Error(`Failed to parse response: objects were converted to string representations (e.g., "[object HumanMessage]"). Make sure to return actual message objects or valid JSON string. Original error: ${parseError.message}`)
                            }
                            throw new Error(`Failed to parse response as JSON: ${parseError}. Response preview: ${response.substring(0, 100)}`)
                        }
                    } else {
                        throw new Error(`Response is not a valid JSON string or array. Received: ${typeof response}. Make sure to return an array of message objects or a valid JSON string.`)
                    }
                } else if (Array.isArray(response)) {
                    // Проверяем, не являются ли элементы массива строками "[object ...]"
                    const hasInvalidStrings = response.some((item: any) => 
                        typeof item === 'string' && (item.startsWith('[object ') || item.includes('[object Hum') || item.includes('[object AIM'))
                    )
                    if (hasInvalidStrings) {
                        throw new Error('Response contains invalid string representations of objects. Make sure to return actual message objects, not stringified versions.')
                    }
                    parsedResponse = response
                } else {
                    throw new Error(`Unexpected response type: ${typeof response}. Expected array or JSON string. Response: ${String(response).substring(0, 100)}`)
                }

                if (!Array.isArray(parsedResponse)) {
                    throw new Error('Returned message history must be an array')
                }
                prompt = ChatPromptTemplate.fromMessages([
                    SystemMessagePromptTemplate.fromTemplate(systemMessagePrompt),
                    ...parsedResponse,
                    HumanMessagePromptTemplate.fromTemplate(humanMessagePrompt)
                ])
            } catch (e) {
                throw new Error(e)
            }
        }

        let promptValues: ICommonObject = {}
        if (promptValuesStr) {
            try {
                promptValues = typeof promptValuesStr === 'object' ? promptValuesStr : JSON.parse(promptValuesStr)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatPromptTemplate's promptValues: " + exception)
            }
        }
        // @ts-ignore
        prompt.promptValues = promptValues

        return prompt
    }
}

module.exports = { nodeClass: ChatPromptTemplate_Prompts }
