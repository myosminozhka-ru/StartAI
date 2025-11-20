import { ClientOptions, OpenAIEmbeddings, OpenAIEmbeddingsParams } from '@langchain/openai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { attachOpenAIApiKey, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
import { getMWSModels, getDefaultMWSEmbeddingModels } from '../../../src/mwsModelLoader'

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
        this.category = 'Embeddings'
        this.description = 'MWS (МТС) API для генерации эмбеддингов для заданного текста'
        this.baseClasses = [this.type, ...getBaseClasses(OpenAIEmbeddings)]
        this.credential = {
            label: 'Подключите учетные данные',
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
                default: 'cotype-2-pro'
            },
            {
                label: 'Удалить переносы строк',
                name: 'stripNewLines',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Размер пакета',
                name: 'batchSize',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Таймаут',
                name: 'timeout',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Размерности',
                name: 'dimensions',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            try {
                // Пытаемся получить API ключ для динамической загрузки моделей
                if (nodeData?.credential) {
                    try {
                        const credentialData = await getCredentialData(nodeData.credential, options)
                        const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
                        if (mwsApiKey) {
                            // Фильтруем только cotype и bge-m3 модели
                            const allModels = await getMWSModels(mwsApiKey)
                            const embeddingModels = allModels.filter(model => 
                                model.name.toLowerCase().includes('cotype') ||
                                model.name.toLowerCase() === 'bge-m3'
                            )
                            if (embeddingModels && embeddingModels.length > 0) {
                                return embeddingModels
                            }
                        }
                    } catch (apiError) {
                        console.warn('Не удалось загрузить embedding модели через MWS API:', apiError)
                    }
                }
                // Fallback к статическим моделям из models.json
                try {
                    const models = await getModels(MODEL_TYPE.EMBEDDING, 'mwsEmbeddings')
                    if (models && models.length > 0) {
                        return models
                    }
                } catch (jsonError) {
                    console.warn('Не удалось загрузить embedding модели из models.json:', jsonError)
                }
                // Последний fallback к дефолтным моделям
                console.info('Используем дефолтные MWS embedding модели')
                return getDefaultMWSEmbeddingModels()
            } catch (error) {
                console.error('Критическая ошибка при загрузке MWS embedding моделей:', error)
                return getDefaultMWSEmbeddingModels()
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const stripNewLines = nodeData.inputs?.stripNewLines as boolean
        const batchSize = nodeData.inputs?.batchSize as string
        const timeout = nodeData.inputs?.timeout as string
        const modelName = nodeData.inputs?.modelName as string
        const dimensions = nodeData.inputs?.dimensions as string

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIEmbeddingsParams> & { configuration?: ClientOptions } = {
            modelName,
            configuration: {
                baseURL: 'https://api.gpt.mws.ru/v1'
            }
        }
        attachOpenAIApiKey(obj, mwsApiKey)

        if (stripNewLines) obj.stripNewLines = stripNewLines
        if (batchSize) obj.batchSize = parseInt(batchSize, 10)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (dimensions) obj.dimensions = parseInt(dimensions, 10)

        const model = new OpenAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: MWSEmbedding_Embeddings }
