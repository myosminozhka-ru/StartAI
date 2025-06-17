import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import type { SafetySetting } from '@google/generative-ai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from './FlowiseChatGoogleGenerativeAI'
import type FlowiseGoogleAICacheManager from '../../cache/GoogleGenerativeAIContextCache/FlowiseGoogleAICacheManager'

class GoogleGenerativeAI_ChatModels implements INode {
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
        this.label = 'ChatGoogleGenerativeAI'
        this.name = 'chatGoogleGenerativeAI'
        this.version = 3.0
        this.type = 'ChatGoogleGenerativeAI'
        this.icon = 'GoogleGemini.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Google Gemini large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatGoogleGenerativeAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleGenerativeAI'],
            optional: false,
            description: 'Google Generative AI credential.'
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Кэш контекста',
                name: 'contextCache',
                type: 'GoogleAICacheManager',
                optional: true
            },
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'gemini-1.5-flash-latest'
            },
            {
                label: 'Пользовательское название модели',
                name: 'customModelName',
                type: 'string',
                placeholder: 'gemini-1.5-pro-exp-0801',
                description: 'Пользовательское название модели для использования. Если указано, переопределит выбранную модель',
                additionalParams: true,
                optional: true
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
                label: 'Максимум выходных токенов',
                name: 'maxOutputTokens',
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
                label: 'Top K токенов с наивысшей вероятностью',
                name: 'topK',
                type: 'number',
                description: `Декодирование с использованием top-k сэмплинга: рассмотрите набор из top_k наиболее вероятных токенов. Должно быть положительным`,
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Категория вреда',
                name: 'harmCategory',
                type: 'multiOptions',
                description:
                    'См. <a target="_blank" href="https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/configure-safety-attributes#safety_attribute_definitions">официальное руководство</a> по использованию категории вреда',
                options: [
                    {
                        label: 'Опасный',
                        name: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT
                    },
                    {
                        label: 'Домогательство',
                        name: HarmCategory.HARM_CATEGORY_HARASSMENT
                    },
                    {
                        label: 'Речь ненависти',
                        name: HarmCategory.HARM_CATEGORY_HATE_SPEECH
                    },
                    {
                        label: 'Сексуально откровенный',
                        name: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Порог блокировки вреда',
                name: 'harmBlockThreshold',
                type: 'multiOptions',
                description:
                    'См. <a target="_blank" href="https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/configure-safety-attributes#safety_setting_thresholds">официальное руководство</a> по использованию порога блокировки вреда',
                options: [
                    {
                        label: 'Низкий и выше',
                        name: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
                    },
                    {
                        label: 'Средний и выше',
                        name: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        label: 'Нет',
                        name: HarmBlockThreshold.BLOCK_NONE
                    },
                    {
                        label: 'Только высокий',
                        name: HarmBlockThreshold.BLOCK_ONLY_HIGH
                    },
                    {
                        label: 'Порог не указан',
                        name: HarmBlockThreshold.HARM_BLOCK_THRESHOLD_UNSPECIFIED
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Базовый URL',
                name: 'baseUrl',
                type: 'string',
                description: 'Базовый URL для API. Оставьте пустым для использования по умолчанию.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Разрешить загрузку изображений',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Разрешить ввод изображений. См. <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">документацию</a> для получения дополнительной информации.',
                default: false,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatGoogleGenerativeAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('googleGenerativeAPIKey', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const harmCategory = nodeData.inputs?.harmCategory as string
        const harmBlockThreshold = nodeData.inputs?.harmBlockThreshold as string
        const cache = nodeData.inputs?.cache as BaseCache
        const contextCache = nodeData.inputs?.contextCache as FlowiseGoogleAICacheManager
        const streaming = nodeData.inputs?.streaming as boolean
        const baseUrl = nodeData.inputs?.baseUrl as string | undefined

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const obj: Partial<GoogleGenerativeAIChatInput> = {
            apiKey: apiKey,
            modelName: customModelName || modelName,
            streaming: streaming ?? true
        }

        // this extra metadata is needed, as langchain does not show the model name in the callbacks.
        obj.metadata = {
            fw_model_name: customModelName || modelName
        }
        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (cache) obj.cache = cache
        if (temperature) obj.temperature = parseFloat(temperature)
        if (baseUrl) obj.baseUrl = baseUrl

        // Safety Settings
        let harmCategories: string[] = convertMultiOptionsToStringArray(harmCategory)
        let harmBlockThresholds: string[] = convertMultiOptionsToStringArray(harmBlockThreshold)
        if (harmCategories.length != harmBlockThresholds.length)
            throw new Error(`Harm Category & Harm Block Threshold are not the same length`)
        const safetySettings: SafetySetting[] = harmCategories.map((harmCategory, index) => {
            return {
                category: harmCategory as HarmCategory,
                threshold: harmBlockThresholds[index] as HarmBlockThreshold
            }
        })
        if (safetySettings.length > 0) obj.safetySettings = safetySettings

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const model = new ChatGoogleGenerativeAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        if (contextCache) model.setContextCache(contextCache)

        return model
    }
}

module.exports = { nodeClass: GoogleGenerativeAI_ChatModels }
