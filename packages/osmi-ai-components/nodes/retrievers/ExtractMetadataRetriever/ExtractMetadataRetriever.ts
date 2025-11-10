import { Document } from '@langchain/core/documents'
import { VectorStore, VectorStoreRetriever, VectorStoreRetrieverInput } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'
import { z } from 'zod'
// import { convertStructuredSchemaToZod } from '../../sequentialagents/commonUtils' // Закомментировано: файл удален в minimal версии

// Временная заглушка для convertStructuredSchemaToZod
const convertStructuredSchemaToZod = (schema: any) => {
    return {}
}

const queryPrefix = 'query'
const defaultPrompt = `Extract keywords from the query: {{${queryPrefix}}}`

class ExtractMetadataRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge?: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Ретривер с извлечением метаданных'
        this.name = 'extractMetadataRetriever'
        this.version = 1.0
        this.type = 'ExtractMetadataRetriever'
        this.icon = 'dynamicMetadataRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Извлечь ключевые слова/метаданные из запроса и использовать их для фильтрации документов'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Векторное хранилище',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Чат модель',
                name: 'model',
                type: 'BaseChatModel'
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
                label: 'Промпт',
                name: 'dynamicMetadataFilterRetrieverPrompt',
                type: 'string',
                description: 'Промпт для извлечения метаданных из запроса',
                rows: 4,
                additionalParams: true,
                default: defaultPrompt
            },
            {
                label: 'Структурированный JSON вывод',
                name: 'dynamicMetadataFilterRetrieverStructuredOutput',
                type: 'datagrid',
                description:
                    'Инструктировать модель давать вывод в структурированной JSON схеме. Этот вывод будет использован как фильтр метаданных для подключенного векторного хранилища',
                datagrid: [
                    { field: 'key', headerName: 'Ключ', editable: true },
                    {
                        field: 'type',
                        headerName: 'Тип',
                        type: 'singleSelect',
                        valueOptions: ['String', 'String Array', 'Number', 'Boolean', 'Enum'],
                        editable: true
                    },
                    { field: 'enumValues', headerName: 'Значения Enum', editable: true },
                    { field: 'description', headerName: 'Описание', flex: 1, editable: true }
                ],
                optional: true,
                additionalParams: true
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
                label: 'Ретривер с извлечением метаданных',
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
        let llm = nodeData.inputs?.model
        const llmStructuredOutput = nodeData.inputs?.dynamicMetadataFilterRetrieverStructuredOutput
        const topK = nodeData.inputs?.topK as string
        const dynamicMetadataFilterRetrieverPrompt = nodeData.inputs?.dynamicMetadataFilterRetrieverPrompt as string
        const query = nodeData.inputs?.query as string
        const finalInputQuery = query ? query : input

        const output = nodeData.outputs?.output as string

        if (llmStructuredOutput && llmStructuredOutput !== '[]') {
            try {
                const structuredOutput = z.object(convertStructuredSchemaToZod(llmStructuredOutput))

                // @ts-ignore
                llm = llm.withStructuredOutput(structuredOutput)
            } catch (exception) {
                console.error(exception)
            }
        }

        const retriever = DynamicMetadataRetriever.fromVectorStore(vectorStore, {
            structuredLLM: llm,
            prompt: dynamicMetadataFilterRetrieverPrompt,
            topK: topK ? parseInt(topK, 10) : (vectorStore as any)?.k ?? 4
        })
        retriever.filter = vectorStore?.lc_kwargs?.filter ?? (vectorStore as any).filter

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(finalInputQuery)
        else if (output === 'text') {
            let finaltext = ''

            const docs = await retriever.getRelevantDocuments(finalInputQuery)

            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

type RetrieverInput<V extends VectorStore> = Omit<VectorStoreRetrieverInput<V>, 'k'> & {
    topK?: number
    structuredLLM: any
    prompt: string
}

class DynamicMetadataRetriever<V extends VectorStore> extends VectorStoreRetriever<V> {
    topK = 4
    structuredLLM: any
    prompt = ''

    constructor(input: RetrieverInput<V>) {
        super(input)
        this.topK = input.topK ?? this.topK
        this.structuredLLM = input.structuredLLM ?? this.structuredLLM
        this.prompt = input.prompt ?? this.prompt
    }

    async getFilter(query: string): Promise<any> {
        const structuredResponse = await this.structuredLLM.invoke(this.prompt.replace(`{{${queryPrefix}}}`, query))
        return structuredResponse
    }

    async getRelevantDocuments(query: string): Promise<Document[]> {
        const newFilter = await this.getFilter(query)
        // @ts-ignore
        this.filter = { ...this.filter, ...newFilter }
        const results = await this.vectorStore.similaritySearchWithScore(query, this.topK, this.filter)

        const finalDocs: Document[] = []
        for (const result of results) {
            finalDocs.push(
                new Document({
                    pageContent: result[0].pageContent,
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

module.exports = { nodeClass: ExtractMetadataRetriever_Retrievers }
