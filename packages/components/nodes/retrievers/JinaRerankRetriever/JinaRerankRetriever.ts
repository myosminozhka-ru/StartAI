import { BaseRetriever } from '@langchain/core/retrievers'
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { JinaRerank } from './JinaRerank'

class JinaRerankRetriever_Retrievers implements INode {
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
    badge: string
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Jina AI Ранжирующий ретривер'
        this.name = 'JinaRerankRetriever'
        this.version = 1.0
        this.type = 'JinaRerankRetriever'
        this.icon = 'JinaAI.svg'
        this.category = 'Retrievers'
        this.description = 'Jina AI Rerank индексирует документы от наиболее до наименее семантически релевантных запросу.'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['jinaAIApi']
        }
        this.inputs = [
            {
                label: 'Ретривер векторного хранилища',
                name: 'baseRetriever',
                type: 'VectorStoreRetriever'
            },
            {
                label: 'Название модели',
                name: 'model',
                type: 'options',
                options: [
                    {
                        label: 'jina-reranker-v2-base-multilingual',
                        name: 'jina-reranker-v2-base-multilingual'
                    },
                    {
                        label: 'jina-colbert-v2',
                        name: 'jina-colbert-v2'
                    }
                ],
                default: 'jina-reranker-v2-base-multilingual',
                optional: true
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
                label: 'Top N',
                name: 'topN',
                description: 'Количество лучших результатов для получения. По умолчанию 4',
                placeholder: '4',
                default: 4,
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Jina AI Ранжирующий ретривер',
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

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const baseRetriever = nodeData.inputs?.baseRetriever as BaseRetriever
        const model = nodeData.inputs?.model as string
        const query = nodeData.inputs?.query as string
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const jinaApiKey = getCredentialParam('jinaAIAPIKey', credentialData, nodeData)
        const topN = nodeData.inputs?.topN ? parseFloat(nodeData.inputs?.topN as string) : 4
        const output = nodeData.outputs?.output as string

        const jinaCompressor = new JinaRerank(jinaApiKey, model, topN)

        const retriever = new ContextualCompressionRetriever({
            baseCompressor: jinaCompressor,
            baseRetriever: baseRetriever
        })

        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.invoke(query ? query : input)
        else if (output === 'text') {
            const docs = await retriever.invoke(query ? query : input)
            let finaltext = ''
            for (const doc of docs) finaltext += `${doc.pageContent}\n`

            return handleEscapeCharacters(finaltext, false)
        }

        return retriever
    }
}

module.exports = { nodeClass: JinaRerankRetriever_Retrievers }
