import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { BaseRetriever } from '@langchain/core/retrievers'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { ReciprocalRankFusion } from './ReciprocalRankFusion'
import { handleEscapeCharacters } from '../../../src/utils'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class RRFRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    badge: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Ретривер с взаимным ранжированием'
        this.name = 'RRFRetriever'
        this.version = 1.0
        this.type = 'RRFRetriever'
        this.icon = 'rrfRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Взаимное ранжирование для переранжирования результатов поиска путем генерации множественных запросов.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Ретривер векторного хранилища',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Запрос',
                name: 'query',
                type: 'string',
                description: 'Запрос для извлечения документов из ретривера. Если не указан, будет использован вопрос пользователя',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Количество запросов',
                name: 'queryCount',
                description: 'Количество синтетических запросов для генерации. По умолчанию 4',
                placeholder: '4',
                type: 'number',
                default: 4,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Количество лучших результатов для получения. По умолчанию равно TopK базового ретривера',
                placeholder: '0',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Константа',
                name: 'c',
                description:
                    'Константа, добавляемая к рангу, контролирующая баланс между важностью высокоранжированных элементов и рассмотрением низкоранжированных элементов.\n' +
                    'По умолчанию 60',
                placeholder: '60',
                type: 'number',
                default: 60,
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Ретривер с взаимным ранжированием',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документов, содержащих метаданные и pageContent',
                baseClasses: ['Document', 'json']
            },
            {
                label: 'Текст',
                name: 'text',
                description: 'Объединенная строка из pageContent документов',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string): Promise<any> {
        const llm = nodeData.inputs?.model as BaseLanguageModel
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const query = nodeData.inputs?.query as string
        const queryCount = nodeData.inputs?.queryCount as string
        const q = queryCount ? parseFloat(queryCount) : 4
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : (baseRetriever as VectorStoreRetriever).k ?? 4
        const constantC = nodeData.inputs?.c as string
        const c = topK ? parseFloat(constantC) : 60
        const output = nodeData.outputs?.output as string

        const ragFusion = new ReciprocalRankFusion(llm, baseRetriever as VectorStoreRetriever, q, k, c)
        const retriever = new ContextualCompressionRetriever({
            baseCompressor: ragFusion,
            baseRetriever: baseRetriever
        })

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(query ? query : input)
        else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(query ? query : input)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: RRFRetriever_Retrievers }
