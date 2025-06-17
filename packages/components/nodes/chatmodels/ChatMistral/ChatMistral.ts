import { BaseCache } from '@langchain/core/caches'
import { ChatMistralAI, ChatMistralAIInput } from '@langchain/mistralai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class ChatMistral_ChatModels implements INode {
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
        this.label = 'ChatMistralAI'
        this.name = 'chatMistralAI'
        this.version = 4.0
        this.type = 'ChatMistralAI'
        this.icon = 'MistralAI.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Mistral large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatMistralAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mistralAIApi']
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
                default: 'mistral-tiny'
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                description:
                    'Какую температуру сэмплинга использовать, от 0.0 до 1.0. Более высокие значения, такие как 0.8, сделают вывод более случайным, а более низкие значения, такие как 0.2, сделают его более сфокусированным и детерминированным.',
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
                description: 'Максимальное количество токенов для генерации в завершении.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Вероятность Top P',
                name: 'topP',
                type: 'number',
                description:
                    'Ядерный сэмплинг, где модель рассматривает результаты токенов с вероятностной массой top_p. Так что 0.1 означает, что рассматриваются только токены, составляющие верхние 10% вероятностной массы.',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Случайное зерно',
                name: 'randomSeed',
                type: 'number',
                description:
                    'Зерно для использования при случайном сэмплинге. Если установлено, разные вызовы будут генерировать детерминированные результаты.',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Безопасный режим',
                name: 'safeMode',
                type: 'boolean',
                description: 'Вводить ли безопасный промпт перед всеми разговорами.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Переопределить endpoint',
                name: 'overrideEndpoint',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatMistralAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('mistralAIAPIKey', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const safeMode = nodeData.inputs?.safeMode as boolean
        const randomSeed = nodeData.inputs?.safeMode as string
        const overrideEndpoint = nodeData.inputs?.overrideEndpoint as string
        const streaming = nodeData.inputs?.streaming as boolean
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ChatMistralAIInput = {
            apiKey: apiKey,
            modelName: modelName,
            streaming: streaming ?? true
        }

        if (maxOutputTokens) obj.maxTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (cache) obj.cache = cache
        if (temperature) obj.temperature = parseFloat(temperature)
        if (randomSeed) obj.randomSeed = parseFloat(randomSeed)
        if (safeMode) obj.safeMode = safeMode
        if (overrideEndpoint) obj.endpoint = overrideEndpoint

        const model = new ChatMistralAI(obj)

        return model
    }
}

module.exports = { nodeClass: ChatMistral_ChatModels }
