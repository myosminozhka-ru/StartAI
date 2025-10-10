import { BaseOutputParser, CustomListOutputParser as LangchainCustomListOutputParser } from '@langchain/core/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'
import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'

class CustomListOutputParser implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Пользовательский парсер списка'
        this.name = 'customListOutputParser'
        this.version = 1.0
        this.type = 'CustomListOutputParser'
        this.description = 'Парсить вывод вызова LLM как список значений.'
        this.icon = 'list.svg'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
            {
                label: 'Длина',
                name: 'length',
                type: 'number',
                step: 1,
                description: 'Количество значений для возврата',
                optional: true
            },
            {
                label: 'Разделитель',
                name: 'separator',
                type: 'string',
                description: 'Разделитель между значениями',
                default: ',',
                optional: true
            },
            {
                label: 'Автоисправление',
                name: 'autofixParser',
                type: 'boolean',
                optional: true,
                description: 'В случае неудачи первого вызова, сделает еще один вызов к модели для исправления любых ошибок.'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const separator = nodeData.inputs?.separator as string
        const lengthStr = nodeData.inputs?.length as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        const parser = new LangchainCustomListOutputParser({
            length: lengthStr ? parseInt(lengthStr, 10) : undefined,
            separator: separator
        })
        Object.defineProperty(parser, 'autoFix', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: autoFix
        })
        return parser
    }
}

module.exports = { nodeClass: CustomListOutputParser }
