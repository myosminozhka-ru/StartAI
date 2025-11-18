import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields, OpenAIClient } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatOpenAI } from './FlowiseChatOpenAI'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { ProxyAgent } from 'undici'

class ChatOpenAI_ChatModels implements INode {
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
        this.label = 'ChatOpenAI'
        this.name = 'chatOpenAI'
        this.version = 8.2
        this.type = 'ChatOpenAI'
        this.icon = 'openai.svg'
        this.category = 'Chat Models'
        this.description = 'Обертка вокруг больших языковых моделей OpenAI, использующих Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatOpenAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
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
                default: 'gpt-4o-mini'
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
                    'Поддерживает ли модель аргумент `strict` при передаче инструментов. Если не указано, аргумент `strict` не будет передан в OpenAI.',
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
                label: 'Базовый путь',
                name: 'basepath',
                type: 'string',
                optional: true,
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
                    'Разрешить ввод изображений. См. <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">документацию</a> для подробностей.',
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
            },
            {
                label: 'Усилие рассуждения',
                description: 'Ограничивает усилия на рассуждения для моделей рассуждений. Применимо только для моделей o1 и o3.',
                name: 'reasoningEffort',
                type: 'options',
                options: [
                    {
                        label: 'Низкое',
                        name: 'low'
                    },
                    {
                        label: 'Среднее',
                        name: 'medium'
                    },
                    {
                        label: 'Высокое',
                        name: 'high'
                    }
                ],
                default: 'medium',
                optional: false,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatOpenAI')
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
        const basePath = nodeData.inputs?.basepath as string
        const proxyUrl = nodeData.inputs?.proxyUrl as string || process.env.HTTPS_PROXY || process.env.HTTP_PROXY
        const baseOptions = nodeData.inputs?.baseOptions
        const reasoningEffort = nodeData.inputs?.reasoningEffort as OpenAIClient.Chat.ChatCompletionReasoningEffort

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const imageResolution = nodeData.inputs?.imageResolution as string

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        
        // Проверяем все возможные источники API ключа
        let openAIApiKey = 
            getCredentialParam('openAIApiKey', credentialData, nodeData) ||
            credentialData?.openAIApiKey ||
            nodeData.inputs?.openAIApiKey ||
            process.env.OPENAI_API_KEY
        
        if (!openAIApiKey) {
            throw new Error('OPENAI_API_KEY отсутствует. Пожалуйста, добавьте учетные данные OpenAI через интерфейс или установите переменную окружения OPENAI_API_KEY.')
        }

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatOpenAIFields = {
            temperature: parseFloat(temperature),
            modelName,
            openAIApiKey,
            apiKey: openAIApiKey,
            streaming: streaming ?? true,
            // Устанавливаем таймаут по умолчанию 60 секунд, если не указан явно
            timeout: timeout ? parseInt(timeout, 10) : 60000
        }

        if (modelName.includes('o3') || modelName.includes('o1')) {
            delete obj.temperature
        }
        if ((modelName.includes('o1') || modelName.includes('o3')) && reasoningEffort) {
            ;(obj as any).reasoningEffort = reasoningEffort
        }
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
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
                throw new Error("Invalid JSON in the ChatOpenAI's BaseOptions: " + exception)
            }
        }

        if (basePath || parsedBaseOptions) {
            obj.configuration = {
                baseURL: basePath,
                defaultHeaders: parsedBaseOptions
            }
        }

        if (proxyUrl) {
            try {
                // Проверяем тип прокси (SOCKS5 или HTTP/HTTPS)
                const isSocks5 = proxyUrl.startsWith('socks5://')
                
                if (isSocks5) {
                    // Для SOCKS5 используем socks-proxy-agent
                    // OpenAI SDK v4 использует undici, но undici не поддерживает SOCKS5 напрямую
                    // Используем глобальную настройку через переменные окружения
                    // и настраиваем fetch через socks-proxy-agent
                    const { SocksProxyAgent } = require('socks-proxy-agent')
                    const socksAgent = new SocksProxyAgent(proxyUrl)
                    
                    // Создаем кастомный fetch, который использует socks-proxy-agent
                    const socksFetch = async (url: string | Request | URL, init?: RequestInit): Promise<Response> => {
                        // Для undici нужно использовать другой подход
                        // Используем node-fetch с socks-proxy-agent
                        const nodeFetch = require('node-fetch')
                        return nodeFetch(url, {
                            ...init,
                            agent: socksAgent
                        } as any)
                    }
                    
                    obj.configuration = {
                        ...obj?.configuration,
                        fetch: socksFetch as any
                    }
                } else {
                    // Для HTTP/HTTPS прокси используем ProxyAgent из undici
                    const proxyAgent = new ProxyAgent(proxyUrl)
                    const proxyFetch = async (url: string | Request | URL, init?: RequestInit): Promise<Response> => {
                        return fetch(url, {
                            ...init,
                            dispatcher: proxyAgent
                        } as any)
                    }
                    obj.configuration = {
                        ...obj?.configuration,
                        httpAgent: proxyAgent as any,
                        fetch: proxyFetch as any
                    }
                }
            } catch (proxyError) {
                // Если прокси не работает, логируем ошибку, но продолжаем без прокси
                console.warn(`[ChatOpenAI] Ошибка настройки прокси: ${proxyError}. Продолжаем без прокси.`)
            }
        }

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false,
                imageResolution
            }
        }

        const model = new ChatOpenAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: ChatOpenAI_ChatModels }
