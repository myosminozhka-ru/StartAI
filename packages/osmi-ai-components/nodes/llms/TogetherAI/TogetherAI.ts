import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'
import { TogetherAI, TogetherAIInputs } from '@langchain/community/llms/togetherai'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { BaseCache } from '@langchain/core/caches'

class TogetherAI_LLMs implements INode {
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
        this.label = 'TogetherAI'
        this.name = 'togetherAI'
        this.version = 1.0
        this.type = 'TogetherAI'
        this.icon = 'togetherai.png'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг больших языковых моделей TogetherAI'
        this.baseClasses = [this.type, ...getBaseClasses(TogetherAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['togetherAIApi']
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
                type: 'string',
                description: 'Название модели для запроса.'
            },
            {
                label: 'Верхний K',
                name: 'topK',
                type: 'number',
                description:
                    'Параметр topK используется для ограничения количества вариантов для следующего предсказанного слова или токена. Он указывает максимальное количество токенов для рассмотрения на каждом шаге на основе их вероятности появления. Эта техника помогает ускорить процесс генерации и может улучшить качество сгенерированного текста, фокусируясь на наиболее вероятных вариантах.',
                step: 1,
                default: 50
            },
            {
                label: 'Верхний P',
                name: 'topP',
                type: 'number',
                description:
                    'Параметр topP (ядро) используется для динамической настройки количества вариантов для каждого предсказанного токена на основе кумулятивных вероятностей. Он указывает порог вероятности, ниже которого все менее вероятные токены отфильтровываются. Эта техника помогает поддерживать разнообразие и генерировать более беглый и естественно звучащий текст.',
                step: 0.1,
                default: 0.7
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                description:
                    'Десятичное число, которое определяет степень случайности в ответе. Значение 1 всегда даст одинаковый результат. Температура меньше 1 предпочитает более правильность и подходит для ответов на вопросы или резюмирования. Значение больше 1 вносит больше случайности в результат.',
                step: 0.1,
                default: 0.7
            },
            {
                label: 'Штраф за повторение',
                name: 'repeatPenalty',
                type: 'number',
                description:
                    'Число, которое контролирует разнообразие сгенерированного текста, уменьшая вероятность повторяющихся последовательностей. Более высокие значения уменьшают повторение.',
                step: 0.1,
                default: 1
            },
            {
                label: 'Потоковая передача',
                name: 'streaming',
                type: 'boolean',
                default: false,
                description: 'Потоковая передача токенов по мере их генерации'
            },
            {
                label: 'Максимальное количество токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description: 'Ограничить количество генерируемых токенов.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Стоп-последовательность',
                name: 'stop',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description: 'Список токенов, на которых должна остановиться генерация.',
                optional: true,
                additionalParams: true
            }
            // todo: safetyModel? logprobs?
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'togetherAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const repeatPenalty = nodeData.inputs?.repeatPenalty as string
        const modelName = nodeData.inputs?.modelName as string
        const stop = nodeData.inputs?.stop as string
        const streaming = nodeData.inputs?.streaming as boolean

        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const togetherAiApiKey = getCredentialParam('togetherAIApiKey', credentialData, nodeData)

        const obj: TogetherAIInputs = {
            modelName,
            apiKey: togetherAiApiKey,
            streaming: streaming ?? false
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseFloat(topK)
        if (repeatPenalty) obj.repetitionPenalty = parseFloat(repeatPenalty)
        if (streaming) obj.streaming = streaming
        if (stop) {
            obj.stop = stop.split(',')
        }
        if (cache) obj.cache = cache

        const togetherAI = new TogetherAI(obj)
        return togetherAI
    }
}

module.exports = { nodeClass: TogetherAI_LLMs }
