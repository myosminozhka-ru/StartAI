import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields, OpenAIClient } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatMWS } from './OSMIChatMWS'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { getMWSModels, getDefaultMWSModels } from '../../../src/mwsModelLoader'
import { HttpsProxyAgent } from 'https-proxy-agent'

class ChatMWS_ChatModels implements INode {
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
        this.label = 'ChatMWS'
        this.name = 'chatMWS'
        this.version = 1.0
        this.type = 'ChatMWS'
        this.icon = 'mws.svg'
        this.category = 'Chat Models'
        this.description = 'Обертка вокруг больших языковых моделей MWS (МТС), использующих Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatOpenAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mwsApi']
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
                default: 0.9,
                optional: true
            },
            {
                label: 'Потоковая передача',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Максимум токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Вероятность Top P',
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
            },
            {
                label: 'Строгий вызов инструментов',
                name: 'strictToolCalling',
                type: 'boolean',
                description:
                    'Поддерживает ли модель аргумент `strict` при передаче инструментов. Если не указано, аргумент `strict` не будет передан в MWS.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Стоп-последовательность',
                name: 'stopSequence',
                type: 'string',
                rows: 4,
                optional: true,
                description: 'Список стоп-слов для использования при генерации. Используйте запятую для разделения нескольких стоп-слов.',
                additionalParams: true
            },
            {
                label: 'URL прокси',
                name: 'proxyUrl',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Базовые опции',
                name: 'baseOptions',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Разрешить загрузку изображений',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Разрешить ввод изображений. См. <a href="https://docs.OSMIai.com/using-OSMI/uploads#image" target="_blank">документацию</a> для подробностей.',
                default: false,
                optional: true
            },
            {
                label: 'Разрешение изображения',
                description: 'Этот параметр контролирует разрешение, в котором модель просматривает изображение.',
                name: 'imageResolution',
                type: 'options',
                options: [
                    {
                        label: 'Низкое',
                        name: 'low'
                    },
                    {
                        label: 'Высокое',
                        name: 'high'
                    },
                    {
                        label: 'Авто',
                        name: 'auto'
                    }
                ],
                default: 'low',
                optional: false,
                show: {
                    allowImageUploads: true
                }
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            try {
                // Пытаемся получить API ключ для динамической загрузки моделей
                if (nodeData?.credential) {
                    const credentialData = await getCredentialData(nodeData.credential, options)
                    const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
                    if (mwsApiKey) {
                        return await getMWSModels(mwsApiKey)
                    }
                }
                // Fallback к статическим моделям из models.json
                return await getModels(MODEL_TYPE.CHAT, 'chatMWS')
            } catch (error) {
                console.warn('Ошибка при загрузке MWS моделей, используем дефолтные:', error)
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
        const stopSequence = nodeData.inputs?.stopSequence as string
        const streaming = nodeData.inputs?.streaming as boolean
        const strictToolCalling = nodeData.inputs?.strictToolCalling as boolean
        const proxyUrl = nodeData.inputs?.proxyUrl as string
        const baseOptions = nodeData.inputs?.baseOptions

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const imageResolution = nodeData.inputs?.imageResolution as string

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey: mwsApiKey, // Используем MWS API ключ как OpenAI ключ для совместимости
            streaming: streaming ?? true,
            configuration: {
                baseURL: 'https://api.gpt.mws.ru/v1'
            }
        }

        if (modelName.includes('o3') || modelName.includes('o1')) {
            delete obj.temperature
        }
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        if (stopSequence) {
            const stopSequenceArray = stopSequence.split(',').map((item) => item.trim())
            obj.stop = stopSequenceArray
        }
        if (strictToolCalling) obj.supportsStrictToolCalling = strictToolCalling

        let parsedBaseOptions: any | undefined = undefined

        if (baseOptions) {
            try {
                parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
            } catch (exception) {
                throw new Error("Invalid JSON in the ChatMWS's BaseOptions: " + exception)
            }
        }

        if (parsedBaseOptions) {
            obj.configuration = {
                ...obj.configuration,
                defaultHeaders: parsedBaseOptions
            }
        }

        if (proxyUrl) {
            obj.configuration = {
                ...obj?.configuration,
                httpAgent: new HttpsProxyAgent(proxyUrl)
            }
        }

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false,
                imageResolution
            }
        }

        const model = new ChatMWS(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatMWS_ChatModels }
