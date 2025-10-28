import { VectorStore } from '@langchain/core/vectorstores'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { PromptTemplate } from '@langchain/core/prompts'
import { HydeRetriever, HydeRetrieverOptions, PromptKey } from 'langchain/retrievers/hyde'
import { handleEscapeCharacters } from '../../../src/utils'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class HydeRetriever_Retrievers implements INode {
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
        this.label = 'HyDE Ретривер'
        this.name = 'HydeRetriever'
        this.version = 3.0
        this.type = 'HydeRetriever'
        this.icon = 'hyderetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Использовать HyDE ретривер для извлечения из векторного хранилища'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.inputs = [
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel'
            },
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
                label: 'Выберите определенный промпт',
                name: 'promptKey',
                description: 'Выберите предопределенный промпт',
                type: 'options',
                options: [
                    {
                        label: 'websearch',
                        name: 'websearch',
                        description: `Please write a passage to answer the question
Question: {question}
Passage:`
                    },
                    {
                        label: 'scifact',
                        name: 'scifact',
                        description: `Please write a scientific paper passage to support/refute the claim
Claim: {question}
Passage:`
                    },
                    {
                        label: 'arguana',
                        name: 'arguana',
                        description: `Please write a counter argument for the passage
Passage: {question}
Counter Argument:`
                    },
                    {
                        label: 'trec-covid',
                        name: 'trec-covid',
                        description: `Please write a scientific paper passage to answer the question
Question: {question}
Passage:`
                    },
                    {
                        label: 'fiqa',
                        name: 'fiqa',
                        description: `Please write a financial article passage to answer the question
Question: {question}
Passage:`
                    },
                    {
                        label: 'dbpedia-entity',
                        name: 'dbpedia-entity',
                        description: `Please write a passage to answer the question.
Question: {question}
Passage:`
                    },
                    {
                        label: 'trec-news',
                        name: 'trec-news',
                        description: `Please write a news passage about the topic.
Topic: {question}
Passage:`
                    },
                    {
                        label: 'mr-tydi',
                        name: 'mr-tydi',
                        description: `Please write a passage in Swahili/Korean/Japanese/Bengali to answer the question in detail.
Question: {question}
Passage:`
                    }
                ],
                default: 'websearch'
            },
            {
                label: 'Пользовательский промпт',
                name: 'customPrompt',
                description: 'Если используется пользовательский промпт, это переопределит определенный промпт',
                placeholder: 'Please write a passage to answer the question\nQuestion: {question}\nPassage:',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Количество лучших результатов для получения. По умолчанию 4',
                placeholder: '4',
                type: 'number',
                default: 4,
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'HyDE Ретривер',
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
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const promptKey = nodeData.inputs?.promptKey as PromptKey
        const customPrompt = nodeData.inputs?.customPrompt as string
        const query = nodeData.inputs?.query as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        const obj: HydeRetrieverOptions<any> = {
            llm,
            vectorStore,
            k
        }

        if (customPrompt) obj.promptTemplate = PromptTemplate.fromTemplate(customPrompt)
        else if (promptKey) obj.promptTemplate = promptKey

        const retriever = new HydeRetriever(obj)
        retriever.filter = vectorStore?.lc_kwargs?.filter ?? (vectorStore as any).filter

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

module.exports = { nodeClass: HydeRetriever_Retrievers }
