import { BaseRetriever } from '@langchain/core/retrievers'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract'
import { handleEscapeCharacters } from '../../../src/utils'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class LLMFilterCompressionRetriever_Retrievers implements INode {
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
    badge: string

    constructor() {
        this.label = 'LLM Фильтр ретривер'
        this.name = 'llmFilterRetriever'
        this.version = 1.0
        this.type = 'LLMFilterRetriever'
        this.icon = 'llmFilterRetriever.svg'
        this.category = 'Retrievers'
        this.description =
            'Итерация по изначально возвращенным документам и извлечение из каждого только того контента, который релевантен запросу'
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
            }
        ]
        this.outputs = [
            {
                label: 'LLM Фильтр ретривер',
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
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const model = nodeData.inputs?.model as BaseLanguageModel
        const query = nodeData.inputs?.query as string
        const output = nodeData.outputs?.output as string

        if (!model) throw new Error('There must be a LLM model connected to LLM Filter Retriever')

        const retriever = new ContextualCompressionRetriever({
            baseCompressor: LLMChainExtractor.fromLLM(model),
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

module.exports = { nodeClass: LLMFilterCompressionRetriever_Retrievers }
