import { get } from 'lodash'
import { Document } from '@langchain/core/documents'
import { VectorStore, VectorStoreRetriever, VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'

const defaultReturnFormat = '{{context}}\nSource: {{metadata.source}}'

class CustomRetriever_Retrievers implements INode {
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
        this.label = 'Пользовательский ретривер'
        this.name = 'customRetriever'
        this.version = 1.0
        this.type = 'CustomRetriever'
        this.icon = 'customRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Возвращать результаты на основе предопределенного формата'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Векторное хранилище',
                name: 'vectorStore',
                type: 'VectorStore'
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
                label: 'Формат результата',
                name: 'resultFormat',
                type: 'string',
                rows: 4,
                description:
                    'Формат для возврата результатов. Используйте {{context}} для вставки pageContent документа и {{metadata.key}} для вставки значений метаданных.',
                default: defaultReturnFormat
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Количество лучших результатов для получения. По умолчанию равно topK векторного хранилища',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Пользовательский ретривер',
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
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const query = nodeData.inputs?.query as string
        const topK = nodeData.inputs?.topK as string
        const resultFormat = nodeData.inputs?.resultFormat as string

        const output = nodeData.outputs?.output as string

        const retriever = CustomRetriever.fromVectorStore(vectorStore, {
            resultFormat,
            topK: topK ? parseInt(topK, 10) : (vectorStore as any)?.k ?? 4
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

type RetrieverInput<V extends VectorStore> = Omit<VectorStoreRetrieverInput<V>, 'k'> & {
    topK?: number
    resultFormat?: string
}

class CustomRetriever<V extends VectorStore> extends VectorStoreRetriever<V> {
    resultFormat: string
    topK = 4

    constructor(input: RetrieverInput<V>) {
        super(input)
        this.topK = input.topK ?? this.topK
        this.resultFormat = input.resultFormat ?? this.resultFormat
    }

    async getRelevantDocuments(query: string): Promise<Document[]> {
        const results = await this.vectorStore.similaritySearchWithScore(query, this.topK, this.filter)

        const finalDocs: Document[] = []
        for (const result of results) {
            let res = this.resultFormat.replace(/{{context}}/g, result[0].pageContent)
            res = replaceMetadata(res, result[0].metadata)
            finalDocs.push(
                new Document({
                    pageContent: res,
                    metadata: result[0].metadata
                })
            )
        }
        return finalDocs
    }

    static fromVectorStore<V extends VectorStore>(vectorStore: V, options: Omit<RetrieverInput<V>, 'vectorStore'>) {
        return new this<V>({ ...options, vectorStore })
    }
}

function replaceMetadata(template: string, metadata: Record<string, any>): string {
    const metadataRegex = /{{metadata\.([\w.]+)}}/g

    return template.replace(metadataRegex, (match, path) => {
        const value = get(metadata, path)
        return value !== undefined ? String(value) : match
    })
}

module.exports = { nodeClass: CustomRetriever_Retrievers }
