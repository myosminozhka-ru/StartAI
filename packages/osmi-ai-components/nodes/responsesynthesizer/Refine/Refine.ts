import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ResponseSynthesizerClass } from '../base'

class Refine_LlamaIndex implements INode {
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
        this.label = 'Уточнение'
        this.name = 'refineLlamaIndex'
        this.version = 1.0
        this.type = 'Refine'
        this.icon = 'refine.svg'
        this.category = 'Response Synthesizer'
        this.description =
            'Создать и уточнить ответ, последовательно проходя через каждый извлеченный текстовый фрагмент. Это делает отдельный вызов LLM для каждого узла. Хорошо для более детальных ответов.'
        this.baseClasses = [this.type, 'ResponseSynthesizer']
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Промпт уточнения',
                name: 'refinePrompt',
                type: 'string',
                rows: 4,
                default: `The original query is as follows: {query}
We have provided an existing answer: {existingAnswer}
We have the opportunity to refine the existing answer (only if needed) with some more context below.
------------
{context}
------------
Given the new context, refine the original answer to better answer the query. If the context isn't useful, return the original answer.
Refined Answer:`,
                warning: `Промпт может содержать от 0 до 3 переменных. Переменные должны быть {existingAnswer}, {context} и {query}`,
                optional: true
            },
            {
                label: 'Промпт текстового вопроса-ответа',
                name: 'textQAPrompt',
                type: 'string',
                rows: 4,
                default: `Context information is below.
---------------------
{context}
---------------------
Given the context information and not prior knowledge, answer the query.
Query: {query}
Answer:`,
                warning: `Промпт может содержать от 0 до 2 переменных. Переменные должны быть {context} и {query}`,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const refinePrompt = nodeData.inputs?.refinePrompt as string
        const textQAPrompt = nodeData.inputs?.textQAPrompt as string

        const refinePromptTemplate = ({ context = '', existingAnswer = '', query = '' }) =>
            refinePrompt.replace('{existingAnswer}', existingAnswer).replace('{context}', context).replace('{query}', query)
        const textQAPromptTemplate = ({ context = '', query = '' }) => textQAPrompt.replace('{context}', context).replace('{query}', query)

        return new ResponseSynthesizerClass({ textQAPromptTemplate, refinePromptTemplate, type: 'Refine' })
    }
}

module.exports = { nodeClass: Refine_LlamaIndex }
