import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ResponseSynthesizerClass } from '../base'

class TreeSummarize_LlamaIndex implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Древовидное суммирование'
        this.name = 'treeSummarizeLlamaIndex'
        this.version = 1.0
        this.type = 'TreeSummarize'
        this.icon = 'treesummarize.svg'
        this.category = 'Response Synthesizer'
        this.description =
            'Учитывая набор текстовых фрагментов и запрос, рекурсивно построить дерево и вернуть корневой узел как ответ. Хорошо для целей суммирования.'
        this.baseClasses = [this.type, 'ResponseSynthesizer']
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Промпт',
                name: 'prompt',
                type: 'string',
                rows: 4,
                default: `Context information from multiple sources is below.
---------------------
{context}
---------------------
Given the information from multiple sources and not prior knowledge, answer the query.
Query: {query}
Answer:`,
                warning: `Промпт может содержать от 0 до 2 переменных. Переменные должны быть {context} и {query}`,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const prompt = nodeData.inputs?.prompt as string

        const textQAPromptTemplate = ({ context = '', query = '' }) => prompt.replace('{context}', context).replace('{query}', query)

        return new ResponseSynthesizerClass({ textQAPromptTemplate, type: 'TreeSummarize' })
    }
}

module.exports = { nodeClass: TreeSummarize_LlamaIndex }
