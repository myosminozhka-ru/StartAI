import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class GetVariable_Utilities implements INode {
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
        this.label = 'Получить переменную'
        this.name = 'getVariable'
        this.version = 2.0
        this.type = 'GetVariable'
        this.icon = 'getvar.svg'
        this.category = 'Utilities'
        this.description = `Получить переменную, которая была сохранена с помощью узла Set Variable`
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities']
        this.inputs = [
            {
                label: 'Имя переменной',
                name: 'variableName',
                type: 'string',
                placeholder: 'var1'
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const variableName = nodeData.inputs?.variableName as string
        const dynamicVars = options.dynamicVariables as Record<string, unknown>

        if (Object.prototype.hasOwnProperty.call(dynamicVars, variableName)) {
            return dynamicVars[variableName]
        }
        return undefined
    }
}

module.exports = { nodeClass: GetVariable_Utilities }
