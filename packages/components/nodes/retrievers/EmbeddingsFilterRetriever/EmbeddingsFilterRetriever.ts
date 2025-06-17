import { BaseRetriever } from '@langchain/core/retrievers'
import { Embeddings } from '@langchain/core/embeddings'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { EmbeddingsFilter } from 'langchain/retrievers/document_compressors/embeddings_filter'
import { handleEscapeCharacters } from '../../../src/utils'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class EmbeddingsFilterRetriever_Retrievers implements INode {
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
        this.label = 'Ретривер с фильтром эмбеддингов'
        this.name = 'embeddingsFilterRetriever'
        this.version = 1.0
        this.type = 'EmbeddingsFilterRetriever'
        this.icon = 'compressionRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Компрессор документов, который использует эмбеддинги для отбрасывания документов, не связанных с запросом'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Ретривер векторного хранилища',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Эмбеддинги',
                name: 'embeddings',
                type: 'Embeddings'
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
                label: 'Порог сходства',
                name: 'similarityThreshold',
                description:
                    'Порог для определения того, когда два документа достаточно похожи, чтобы считаться избыточными. Должен быть указан, если `k` не установлен',
                type: 'number',
                default: 0.8,
                step: 0.1,
                optional: true
            },
            {
                label: 'K',
                name: 'k',
                description:
                    'Количество релевантных документов для возврата. Может быть явно установлено как undefined, в этом случае должен быть указан similarity_threshold. По умолчанию 20',
                type: 'number',
                default: 20,
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Ретривер с фильтром эмбеддингов',
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
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const query = nodeData.inputs?.query as string
        const similarityThreshold = nodeData.inputs?.similarityThreshold as string
        const k = nodeData.inputs?.k as string
        const output = nodeData.outputs?.output as string

        if (k === undefined && similarityThreshold === undefined) {
            throw new Error(`Must specify one of "k" or "similarity_threshold".`)
        }

        const similarityThresholdNumber = similarityThreshold ? parseFloat(similarityThreshold) : 0.8
        const kNumber = k ? parseFloat(k) : undefined

        const baseCompressor = new EmbeddingsFilter({
            embeddings: embeddings,
            similarityThreshold: similarityThresholdNumber,
            k: kNumber
        })

        const retriever = new ContextualCompressionRetriever({
            baseCompressor,
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

module.exports = { nodeClass: EmbeddingsFilterRetriever_Retrievers }
