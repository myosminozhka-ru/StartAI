import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { NodeVM } from '@flowiseai/nodevm'
import { DataSource } from 'typeorm'
import { availableDependencies, defaultAllowBuiltInDep, getVars, handleEscapeCharacters, prepareSandboxVars } from '../../../src/utils'

class CustomDocumentLoader_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Пользовательский загрузчик документов'
        this.name = 'customDocumentLoader'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'customDocLoader.svg'
        this.category = 'Document Loaders'
        this.description = `Пользовательская функция для загрузки документов`
        this.baseClasses = [this.type]
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
                label: 'JavaScript функция',
                name: 'javascriptFunction',
                type: 'code',
                description: `Должна возвращать массив объектов документов, содержащих metadata и pageContent, если выбран вывод "Document". Если выбран вывод "Text", должна возвращать строку.`,
                placeholder: `return [
  {
    pageContent: 'Содержимое документа',
    metadata: {
      title: 'Название документа',
    }
  }
]`
            }
        ]
        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документов, содержащих metadata и pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Текст',
                name: 'text',
                description: 'Объединенная строка из содержимого страниц документов',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const output = nodeData.outputs?.output as string
        const javascriptFunction = nodeData.inputs?.javascriptFunction as string
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
                throw new Error('Некорректный JSON во входных переменных пользовательского загрузчика документов: ' + exception)
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

        let sandbox: any = {
            $input: input,
            util: undefined,
            Symbol: undefined,
            child_process: undefined,
            fs: undefined,
            process: undefined
        }
        sandbox['$vars'] = prepareSandboxVars(variables)
        sandbox['$flow'] = flow

        if (Object.keys(inputVars).length) {
            for (const item in inputVars) {
                sandbox[`$${item}`] = inputVars[item]
            }
        }

        const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
            ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
            : defaultAllowBuiltInDep
        const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
        const deps = availableDependencies.concat(externalDeps)

        const nodeVMOptions = {
            console: 'inherit',
            sandbox,
            require: {
                external: { modules: deps },
                builtin: builtinDeps
            },
            eval: false,
            wasm: false,
            timeout: 10000
        } as any

        const vm = new NodeVM(nodeVMOptions)
        try {
            const response = await vm.run(`module.exports = async function() {${javascriptFunction}}()`, __dirname)

            if (output === 'document' && Array.isArray(response)) {
                if (response.length === 0) return response
                if (
                    response[0].pageContent &&
                    typeof response[0].pageContent === 'string' &&
                    response[0].metadata &&
                    typeof response[0].metadata === 'object'
                )
                    return response
                throw new Error('Объект документа должен содержать pageContent и metadata')
            }

            if (output === 'text' && typeof response === 'string') {
                return handleEscapeCharacters(response, false)
            }

            return response
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: CustomDocumentLoader_DocumentLoaders }
