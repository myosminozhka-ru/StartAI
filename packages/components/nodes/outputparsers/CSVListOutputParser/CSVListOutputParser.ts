import { BaseOutputParser, CommaSeparatedListOutputParser } from '@langchain/core/output_parsers'
import { getBaseClasses, INode, INodeData, INodeParams } from '../../../src'
import { CATEGORY } from '../OutputParserHelpers'

class CSVListOutputParser implements INode {
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
        this.label = 'CSV Парсер вывода'
        this.name = 'csvOutputParser'
        this.version = 1.0
        this.type = 'CSVListOutputParser'
        this.description = 'Парсить вывод вызова LLM как список значений, разделенных запятыми'
        this.icon = 'csv.svg'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
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
        const autoFix = nodeData.inputs?.autofixParser as boolean

        const commaSeparatedListOutputParser = new CommaSeparatedListOutputParser()
        Object.defineProperty(commaSeparatedListOutputParser, 'autoFix', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: autoFix
        })
        return commaSeparatedListOutputParser
    }
}

module.exports = { nodeClass: CSVListOutputParser }
