import { DataSource } from 'typeorm'
import { getVars, handleEscapeCharacters, executeJavaScriptCode, createCodeExecutionSandbox } from '../../../src/utils'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class IfElseFunction_Utilities implements INode {
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
        this.label = 'IfElse Функция'
        this.name = 'ifElseFunction'
        this.version = 2.0
        this.type = 'IfElseFunction'
        this.icon = 'ifelsefunction.svg'
        this.category = 'Utilities'
        this.description = `Разделяет потоки на основе If Else javascript функций`
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
        this.inputs = [
            {
                label: 'Входные переменные',
                name: 'functionInputVariables',
                description: 'Входные переменные могут использоваться в функции с префиксом $. Например: $var',
                type: 'json',
                optional: true,
                acceptVariable: true,
                list: true
            },
            {
                label: 'Имя IfElse',
                name: 'functionName',
                type: 'string',
                optional: true,
                placeholder: 'Если условие совпадает'
            },
            {
                label: 'If функция',
                name: 'ifFunction',
                description: 'Функция должна возвращать значение',
                type: 'code',
                rows: 2,
                default: `if ("hello" == "hello") {
    return true;
}`
            },
            {
                label: 'Else функция',
                name: 'elseFunction',
                description: 'Функция должна возвращать значение',
                type: 'code',
                rows: 2,
                default: `return false;`
            }
        ]
        this.outputs = [
            {
                label: 'Истина',
                name: 'returnTrue',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array'],
                isAnchor: true
            },
            {
                label: 'Ложь',
                name: 'returnFalse',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array'],
                isAnchor: true
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const ifFunction = nodeData.inputs?.ifFunction as string
        const elseFunction = nodeData.inputs?.elseFunction as string
        const functionInputVariablesRaw = nodeData.inputs?.functionInputVariables
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity

        const variables = await getVars(appDataSource, databaseEntities, nodeData, options)
        const flow = {
            chatflowId: options.chatflowid,
            sessionId: options.sessionId,
            chatId: options.chatId,
            input
        }

        let inputVars: ICommonObject = {}
        if (functionInputVariablesRaw) {
            try {
                inputVars =
                    typeof functionInputVariablesRaw === 'object' ? functionInputVariablesRaw : JSON.parse(functionInputVariablesRaw)
            } catch (exception) {
                throw new Error('Некорректный JSON во входных переменных IfElse: ' + exception)
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
        const additionalSandbox: ICommonObject = {}

        // Add input variables to sandbox
        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                additionalSandbox[`$${item}`] = inputVars[item]
            }
        }

        const sandbox = createCodeExecutionSandbox(input, variables, flow, additionalSandbox)

        try {
            const responseTrue = await executeJavaScriptCode(ifFunction, sandbox)

            if (responseTrue)
                return { output: typeof responseTrue === 'string' ? handleEscapeCharacters(responseTrue, false) : responseTrue, type: true }

            const responseFalse = await executeJavaScriptCode(elseFunction, sandbox)

            return { output: typeof responseFalse === 'string' ? handleEscapeCharacters(responseFalse, false) : responseFalse, type: false }
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: IfElseFunction_Utilities }
