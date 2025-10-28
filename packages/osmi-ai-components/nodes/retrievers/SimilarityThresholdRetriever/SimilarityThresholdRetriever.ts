import { VectorStore } from '@langchain/core/vectorstores'
import { ScoreThresholdRetriever } from 'langchain/retrievers/score_threshold'
import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'

class SimilarityThresholdRetriever_Retrievers implements INode {
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
        this.label = 'Ретривер с порогом сходства'
        this.name = 'similarityThresholdRetriever'
        this.version = 2.0
        this.type = 'SimilarityThresholdRetriever'
        this.icon = 'similaritythreshold.svg'
        this.category = 'Retrievers'
        this.description = 'Возвращать результаты на основе минимального процента сходства'
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
                label: 'Минимальный балл сходства (%)',
                name: 'minSimilarityScore',
                description: 'Находит результаты с как минимум этим баллом сходства',
                type: 'number',
                default: 80,
                step: 1
            },
            {
                label: 'Максимум K',
                name: 'maxK',
                description: `Максимальное количество результатов для получения`,
                type: 'number',
                default: 20,
                step: 1,
                additionalParams: true
            },
            {
                label: 'K инкремент',
                name: 'kIncrement',
                description: `На сколько увеличивать K каждый раз. Он будет получать N результатов, затем N + kIncrement, затем N + kIncrement * 2 и т.д.`,
                type: 'number',
                default: 2,
                step: 1,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Ретривер с порогом сходства',
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
        const minSimilarityScore = nodeData.inputs?.minSimilarityScore as number
        const query = nodeData.inputs?.query as string
        const maxK = nodeData.inputs?.maxK as string
        const kIncrement = nodeData.inputs?.kIncrement as string

        const output = nodeData.outputs?.output as string

        const retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
            minSimilarityScore: minSimilarityScore ? minSimilarityScore / 100 : 0.9,
            maxK: maxK ? parseInt(maxK, 10) : 100,
            kIncrement: kIncrement ? parseInt(kIncrement, 10) : 2
        })
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

module.exports = { nodeClass: SimilarityThresholdRetriever_Retrievers }
