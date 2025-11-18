import { flatten } from 'lodash'
import { type StructuredTool } from '@langchain/core/tools'
import { DataSource } from 'typeorm'
import { getVars, handleEscapeCharacters, executeJavaScriptCode, createCodeExecutionSandbox } from '../../../src/utils'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class CustomFunction_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Пользовательская JS функция'
        this.name = 'customFunction'
        this.version = 3.0
        this.type = 'CustomFunction'
        this.icon = 'customfunction.svg'
        this.category = 'Utilities'
        this.description = `Выполнить пользовательскую javascript функцию`
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
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
                label: 'Имя функции',
                name: 'functionName',
                type: 'string',
                optional: true,
                placeholder: 'Моя функция'
            },
            {
                label: 'Дополнительные инструменты',
                description: 'Инструменты могут быть использованы в функции через $tools.{tool_name}.invoke(args)',
                name: 'tools',
                type: 'Tool',
                list: true,
                optional: true
            },
            {
                label: 'Javascript функция',
                name: 'javascriptFunction',
                type: 'code'
            }
        ]
        this.outputs = [
            {
                label: 'Выход',
                name: 'output',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array']
            },
            {
                label: 'Завершающий узел',
                name: 'EndingNode',
                baseClasses: [this.type]
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const isEndingNode = nodeData?.outputs?.output === 'EndingNode'
        if (isEndingNode && !options.isRun) return // предотвратить двойной запуск init и run

        const javascriptFunction = nodeData.inputs?.javascriptFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const tools = Object.fromEntries((flatten(nodeData.inputs?.tools) as StructuredTool[])?.map((tool) => [tool.name, tool]) ?? [])

        const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
        const flow = {
            chatflowId: options.chatflowid,
            sessionId: options.sessionId,
            chatId: options.chatId,
            rawOutput: options.rawOutput || '',
            input
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
                    } catch (e) {
                        // игнорируем
                    }
                }
                inputVars[key] = value
            }
        }

        // Create additional sandbox variables
        const additionalSandbox: ICommonObject = {
            $tools: tools
        }

        // Add input variables to sandbox
        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                additionalSandbox[`$${item}`] = inputVars[item]
            }
        }

        const sandbox = createCodeExecutionSandbox(input, variables, flow, additionalSandbox)

        try {
            const response = await executeJavaScriptCode(javascriptFunction, sandbox)

            if (typeof response === 'string' && !isEndingNode) {
                return handleEscapeCharacters(response, false)
            }
            return response
        } catch (e) {
            throw new Error(e)
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string> {
        return await this.init(nodeData, input, { ...options, isRun: true })
    }
}

module.exports = { nodeClass: CustomFunction_Utilities }
