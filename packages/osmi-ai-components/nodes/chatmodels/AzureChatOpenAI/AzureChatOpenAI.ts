import { AzureOpenAIInput, AzureChatOpenAI as LangchainAzureChatOpenAI, ChatOpenAIFields, OpenAIClient } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { AzureChatOpenAI } from './OSMIAzureChatOpenAI'

const serverCredentialsExists =
    !!process.env.AZURE_OPENAI_API_KEY &&
    !!process.env.AZURE_OPENAI_API_INSTANCE_NAME &&
    !!process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME &&
    !!process.env.AZURE_OPENAI_API_VERSION

class AzureChatOpenAI_ChatModels implements INode {
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
        this.label = 'Azure ChatOpenAI'
        this.name = 'azureChatOpenAI'
        this.version = 7.0
        this.type = 'AzureChatOpenAI'
        this.icon = 'Azure.svg'
        this.category = 'Chat Models'
        this.description = 'Обертка вокруг больших языковых моделей Azure OpenAI, использующих Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainAzureChatOpenAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['azureOpenAIApi'],
            optional: serverCredentialsExists
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
                loadMethod: 'listModels'
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
                label: 'Максимум токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
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
                label: 'Вероятность Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф частоты',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф присутствия',
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
                label: 'Базовый путь',
                name: 'basepath',
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
                    'Разрешить ввод изображений. См. <a href="https://docs.OSMIai.com/using-OSMI/uploads#image" target="_blank">документацию</a> для получения дополнительной информации.',
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
                additionalParams: true
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
            return await getModels(MODEL_TYPE.CHAT, 'azureChatOpenAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const streaming = nodeData.inputs?.streaming as boolean
        const cache = nodeData.inputs?.cache as BaseCache
        const topP = nodeData.inputs?.topP as string
        const basePath = nodeData.inputs?.basepath as string
        const baseOptions = nodeData.inputs?.baseOptions
        const reasoningEffort = nodeData.inputs?.reasoningEffort as OpenAIClient.Chat.ChatCompletionReasoningEffort

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const azureOpenAIApiKey = getCredentialParam('azureOpenAIApiKey', credentialData, nodeData)
        const azureOpenAIApiInstanceName = getCredentialParam('azureOpenAIApiInstanceName', credentialData, nodeData)
        const azureOpenAIApiDeploymentName = getCredentialParam('azureOpenAIApiDeploymentName', credentialData, nodeData)
        const azureOpenAIApiVersion = getCredentialParam('azureOpenAIApiVersion', credentialData, nodeData)

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean
        const imageResolution = nodeData.inputs?.imageResolution as string

        const obj: ChatOpenAIFields & Partial<AzureOpenAIInput> = {
            temperature: parseFloat(temperature),
            modelName,
            azureOpenAIApiKey,
            azureOpenAIApiInstanceName,
            azureOpenAIApiDeploymentName,
            azureOpenAIApiVersion,
            streaming: streaming ?? true
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        if (topP) obj.topP = parseFloat(topP)
        if (basePath) obj.azureOpenAIBasePath = basePath
        if (baseOptions) {
            try {
                const parsedBaseOptions = typeof baseOptions === 'object' ? baseOptions : JSON.parse(baseOptions)
                obj.configuration = {
                    defaultHeaders: parsedBaseOptions
                }
            } catch (exception) {
                console.error('Error parsing base options', exception)
            }
        }
        if (modelName === 'o3-mini' || modelName.includes('o1')) {
            delete obj.temperature
        }
        if ((modelName.includes('o1') || modelName.includes('o3')) && reasoningEffort) {
            ;(obj as any).reasoningEffort = reasoningEffort
        }

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false,
                imageResolution
            }
        }

        const model = new AzureChatOpenAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)
        return model
    }
}

module.exports = { nodeClass: AzureChatOpenAI_ChatModels }
