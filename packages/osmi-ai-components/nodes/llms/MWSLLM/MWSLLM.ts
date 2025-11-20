import { OpenAI as LangchainOpenAI, OpenAIInput, ClientOptions } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getMWSModels, getDefaultMWSModels } from '../../../src/mwsModelLoader'

class MWS_LLMs implements INode {
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
        this.label = 'MWS LLM'
        this.name = 'mwsLLM'
        this.version = 1.0
        this.type = 'MWS LLM'
        this.icon = 'mws.svg'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг больших языковых моделей MWS (МТС)'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainOpenAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mwsApi'],
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'mws-gpt-alpha'
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Максимальное количество токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхняя вероятность',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за частоту',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за присутствие',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Таймаут',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            try {
                if (nodeData?.credential) {
                    try {
                        const credentialData = await getCredentialData(nodeData.credential, options)
                        let mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
                        // Убираем кавычки если они есть
                        if (mwsApiKey) {
                            mwsApiKey = mwsApiKey.replace(/^["']|["']$/g, '')
                        }
                        if (mwsApiKey) {
                            const models = await getMWSModels(mwsApiKey)
                            if (models && models.length > 0) {
                                return models
                            }
                        }
                    } catch (apiError) {
                        console.warn('Не удалось загрузить модели через MWS API:', apiError)
                    }
                }
                return getDefaultMWSModels()
            } catch (error) {
                console.error('Ошибка при загрузке MWS моделей:', error)
                return getDefaultMWSModels()
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const cache = nodeData.inputs?.cache as BaseCache

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        let mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
        
        // Убираем кавычки если они есть
        if (mwsApiKey) {
            mwsApiKey = mwsApiKey.replace(/^["']|["']$/g, '')
        }

        if (!mwsApiKey || mwsApiKey.trim() === '') {
            throw new Error('MWS API Key не найден. Выберите credential в настройках узла и сохраните chatflow.')
        }

        const obj: Partial<OpenAIInput> & { configuration?: ClientOptions; cache?: BaseCache } = {
            temperature: parseFloat(temperature),
            modelName,
            apiKey: mwsApiKey,
            maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
            topP: topP ? parseFloat(topP) : undefined,
            frequencyPenalty: frequencyPenalty ? parseFloat(frequencyPenalty) : undefined,
            presencePenalty: presencePenalty ? parseFloat(presencePenalty) : undefined,
            timeout: timeout ? parseInt(timeout, 10) : undefined,
            configuration: {
                baseURL: 'https://api.gpt.mws.ru/v1',
                apiKey: mwsApiKey
            }
        }

        if (cache) obj.cache = cache

        const model = new LangchainOpenAI(obj)
        return model
    }
}

module.exports = { nodeClass: MWS_LLMs }
