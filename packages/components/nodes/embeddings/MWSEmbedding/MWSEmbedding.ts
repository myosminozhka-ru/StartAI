import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Embeddings } from '@langchain/core/embeddings'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

// Полифилл для fetch если не доступен
const fetchApi = globalThis.fetch || require('node-fetch')

class MWSEmbedding extends Embeddings {
    declare model: string
    declare apiKey: string
    declare baseURL: string
    declare batchSize: number
    declare timeout: number

    constructor(fields: {
        model?: string
        apiKey: string
        baseURL?: string
        batchSize?: number
        timeout?: number
    }) {
        super({})
        this.model = fields.model || 'bge-m3'
        this.apiKey = fields.apiKey
        this.baseURL = fields.baseURL || 'https://api.gpt.mws.ru/v1'
        this.batchSize = fields.batchSize || 512
        this.timeout = fields.timeout || 60000
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const batches = []
        for (let i = 0; i < texts.length; i += this.batchSize) {
            batches.push(texts.slice(i, i + this.batchSize))
        }

        const results = []
        for (const batch of batches) {
            const response = await this.embeddingWithRetry(batch)
            results.push(...response)
        }

        return results
    }

    async embedQuery(text: string): Promise<number[]> {
        const response = await this.embeddingWithRetry([text])
        return response[0]
    }

    private async embeddingWithRetry(texts: string[]): Promise<number[][]> {
        const response = await fetchApi(`${this.baseURL}/embeddings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                input: texts
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data.data.map((item: any) => item.embedding)
    }
}

class MWSEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'MWS Embeddings'
        this.name = 'mwsEmbeddings'
        this.version = 1.0
        this.type = 'MWSEmbeddings'
        this.icon = 'mws.svg'
        this.category = 'Встраивания'
        this.description = 'MWS API для генерации векторных представлений текста'
        this.baseClasses = [this.type, ...getBaseClasses(Embeddings)]
        this.credential = {
            label: 'Соединить учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mwsApi']
        }
        this.inputs = [
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'bge-m3'
            },
            {
                label: 'Размер пакета',
                name: 'batchSize',
                type: 'number',
                step: 1,
                default: 512,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Таймаут',
                name: 'timeout',
                type: 'number',
                step: 1,
                default: 60000,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
            const mwsApiBaseUrl = getCredentialParam('mwsApiBaseUrl', credentialData, nodeData) || 'https://api.gpt.mws.ru/v1'

            if (!mwsApiKey) {
                return getModels(MODEL_TYPE.EMBEDDING, 'mwsEmbeddings')
            }

            try {
                const response = await fetchApi(`${mwsApiBaseUrl}/models`, {
                    headers: {
                        'Authorization': `Bearer ${mwsApiKey}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                
                // Фильтруем только embedding модели
                const embeddingModels = data.data?.filter((model: any) => 
                    model.id.includes('embed') || 
                    model.id.includes('bge') || 
                    model.id.includes('e5')
                ) || []

                return embeddingModels.map((model: any) => ({
                    label: model.id,
                    name: model.id,
                    description: model.id
                }))
            } catch (error) {
                console.warn('Ошибка при загрузке моделей MWS, используем статичные модели:', error)
                return getModels(MODEL_TYPE.EMBEDDING, 'mwsEmbeddings')
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<MWSEmbedding> {
        const modelName = nodeData.inputs?.modelName as string
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
        const mwsApiBaseUrl = getCredentialParam('mwsApiBaseUrl', credentialData, nodeData) || 'https://api.gpt.mws.ru/v1'

        if (!mwsApiKey) throw new Error('MWS API Key не найден')

        const obj = new MWSEmbedding({
            model: modelName,
            apiKey: mwsApiKey,
            baseURL: mwsApiBaseUrl,
            batchSize: batchSize ? parseInt(batchSize, 10) : 512,
            timeout: timeout ? parseInt(timeout, 10) : 60000
        })

        return obj
    }
}

module.exports = { nodeClass: MWSEmbedding_Embeddings }
