import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class SetVariable_Utilities implements INode {
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
        this.label = 'Установить переменную'
        this.name = 'setVariable'
        this.version = 2.1
        this.type = 'SetVariable'
        this.icon = 'setvar.svg'
        this.category = 'Utilities'
        this.description = `Установить переменную, которую можно получить на более позднем этапе. Переменная доступна только во время выполнения.`
        this.tags = ['Utilities']
        this.baseClasses = [this.type, 'Utilities']
        this.inputs = [
            {
                label: 'Входные данные',
                name: 'input',
                type: 'string | number | boolean | json | array',
                optional: true,
                list: true
            },
            {
                label: 'Имя переменной',
                name: 'variableName',
                type: 'string',
                placeholder: 'var1'
            },
            {
                label: 'Показать вывод',
                name: 'showOutput',
                description: 'Показать результат вывода в ответе API Prediction',
                type: 'boolean',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Вывод',
                name: 'output',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array']
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        let inputRaw = nodeData.inputs?.input
        const variableName = nodeData.inputs?.variableName as string

        if (Array.isArray(inputRaw) && inputRaw.length === 1) {
            inputRaw = inputRaw[0]
        }

        return { output: inputRaw, dynamicVariables: { [variableName]: inputRaw } }
    }
}

module.exports = { nodeClass: SetVariable_Utilities }
