import { OpenAIChatInput, ChatOpenAI } from '@langchain/openai'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatLitellm_ChatModels implements INode {
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
        this.label = 'ChatLitellm'
        this.name = 'chatLitellm'
        this.version = 1.0
        this.type = 'ChatLitellm'
        this.icon = 'litellm.jpg'
        this.category = 'Chat Models'
        this.description = 'Connect to a Litellm server using OpenAI-compatible API'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(ChatOpenAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['litellmApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Базовый URL',
                name: 'basePath',
                type: 'string',
                placeholder: 'http://localhost:8000'
            },
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'string',
                placeholder: 'model_name'
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
                label: 'Top P',
                name: 'topP',
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const basePath = nodeData.inputs?.basePath as string
        const modelName = nodeData.inputs?.modelName as string
        const temperature = nodeData.inputs?.temperature as string
        const streaming = nodeData.inputs?.streaming as boolean
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('litellmApiKey', credentialData, nodeData)

        const obj: Partial<OpenAIChatInput> &
            BaseLLMParams & { openAIApiKey?: string } & { configuration?: { baseURL?: string; defaultHeaders?: ICommonObject } } = {
            temperature: parseFloat(temperature),
            modelName,
            streaming: streaming ?? true
        }

        if (basePath) {
            obj.configuration = {
                baseURL: basePath
            }
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (cache) obj.cache = cache
        if (apiKey) obj.openAIApiKey = apiKey

        const model = new ChatOpenAI(obj)

        return model
    }
}

module.exports = { nodeClass: ChatLitellm_ChatModels }
