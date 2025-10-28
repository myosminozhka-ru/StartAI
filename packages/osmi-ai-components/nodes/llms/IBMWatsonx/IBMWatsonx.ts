import { ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'
import { WatsonxLLM, WatsonxInputLLM } from '@langchain/community/llms/ibm'
import { WatsonxAuth } from '@langchain/community/dist/types/ibm'
import { BaseCache } from '@langchain/core/caches'

class IBMWatsonx_LLMs implements INode {
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
        this.label = 'IBMWatsonx'
        this.name = 'ibmWatsonx'
        this.version = 1.0
        this.type = 'IBMWatsonx'
        this.icon = 'ibm.png'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг базовых моделей IBM watsonx.ai'
        this.baseClasses = [this.type, ...getBaseClasses(WatsonxLLM)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['ibmWatsonx']
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Модель',
                name: 'modelId',
                type: 'string',
                default: 'ibm/granite-13b-instruct-v2',
                description: 'Название модели для запроса.'
            },
            {
                label: 'Метод декодирования',
                name: 'decodingMethod',
                type: 'options',
                options: [
                    { label: 'sample', name: 'sample' },
                    { label: 'greedy', name: 'greedy' }
                ],
                default: 'greedy',
                description:
                    'Установите декодирование в Greedy, чтобы всегда выбирать слова с наивысшей вероятностью. Установите декодирование в Sampling для настройки вариативности выбора слов.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхний K',
                name: 'topK',
                type: 'number',
                description:
                    'Параметр topK используется для ограничения количества вариантов для следующего предсказанного слова или токена. Он указывает максимальное количество токенов для рассмотрения на каждом шаге на основе их вероятности появления. Эта техника помогает ускорить процесс генерации и может улучшить качество сгенерированного текста, фокусируясь на наиболее вероятных вариантах.',
                step: 1,
                default: 50,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхний P',
                name: 'topP',
                type: 'number',
                description:
                    'Параметр topP (ядро) используется для динамической настройки количества вариантов для каждого предсказанного токена на основе кумулятивных вероятностей. Он указывает порог вероятности, ниже которого все менее вероятные токены отфильтровываются. Эта техника помогает поддерживать разнообразие и генерировать более беглый и естественно звучащий текст.',
                step: 0.1,
                default: 0.7,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                description:
                    'Десятичное число, которое определяет степень случайности в ответе. Значение 1 всегда даст одинаковый результат. Температура меньше 1 предпочитает более правильность и подходит для ответов на вопросы или резюмирования. Значение больше 1 вносит больше случайности в результат.',
                step: 0.1,
                default: 0.7,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за повторение',
                name: 'repetitionPenalty',
                type: 'number',
                description:
                    'Число, которое контролирует разнообразие сгенерированного текста, уменьшая вероятность повторяющихся последовательностей. Более высокие значения уменьшают повторение.',
                step: 0.1,
                default: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Потоковая передача',
                name: 'streaming',
                type: 'boolean',
                default: false,
                description: 'Потоковая передача токенов по мере их генерации.'
            },
            {
                label: 'Максимальное количество новых токенов',
                name: 'maxNewTokens',
                type: 'number',
                step: 1,
                default: 100,
                description:
                    'Максимальное количество новых токенов для генерации. Максимальное поддерживаемое значение для этого поля зависит от используемой модели.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Минимальное количество новых токенов',
                name: 'minNewTokens',
                type: 'number',
                step: 1,
                default: 1,
                description: 'Если даны стоп-последовательности, они игнорируются до генерации минимального количества токенов.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Стоп-последовательность',
                name: 'stopSequence',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description: 'Список токенов, на которых должна остановиться генерация.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Включить стоп-последовательность',
                name: 'includeStopSequence',
                type: 'boolean',
                default: false,
                description:
                    'Передайте false, чтобы исключить совпадающие стоп-последовательности из конца выходного текста. По умолчанию true, что означает, что вывод будет заканчиваться текстом стоп-последовательности при совпадении.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Случайное зерно',
                name: 'randomSeed',
                type: 'number',
                placeholder: '62345',
                description: 'Зерно генератора случайных чисел для использования в режиме выборки для экспериментальной повторяемости.',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const decodingMethod = nodeData.inputs?.decodingMethod as string
        const temperature = nodeData.inputs?.temperature as string
        const maxNewTokens = nodeData.inputs?.maxNewTokens as string
        const minNewTokens = nodeData.inputs?.minNewTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const repetitionPenalty = nodeData.inputs?.repetitionPenalty as string
        const modelId = nodeData.inputs?.modelId as string
        const stopSequence = nodeData.inputs?.stopSequence as string
        const randomSeed = nodeData.inputs?.randomSeed as string
        const includeStopSequence = nodeData.inputs?.includeStopSequence as boolean
        const streaming = nodeData.inputs?.streaming as boolean

        const cache = nodeData.inputs?.cache as BaseCache

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const version = getCredentialParam('version', credentialData, nodeData)
        const serviceUrl = getCredentialParam('serviceUrl', credentialData, nodeData)
        const projectId = getCredentialParam('projectId', credentialData, nodeData)
        const watsonxAIAuthType = getCredentialParam('watsonxAIAuthType', credentialData, nodeData)
        const watsonxAIApikey = getCredentialParam('watsonxAIApikey', credentialData, nodeData)
        const watsonxAIBearerToken = getCredentialParam('watsonxAIBearerToken', credentialData, nodeData)

        const auth = {
            version,
            serviceUrl,
            projectId,
            watsonxAIAuthType,
            watsonxAIApikey,
            watsonxAIBearerToken
        }

        const obj: WatsonxInputLLM & WatsonxAuth = {
            ...auth,
            model: modelId,
            streaming: streaming ?? true
        }

        if (decodingMethod) obj.decodingMethod = decodingMethod
        if (repetitionPenalty) obj.repetitionPenalty = parseFloat(repetitionPenalty)
        if (maxNewTokens) obj.maxNewTokens = parseInt(maxNewTokens)
        if (minNewTokens) obj.minNewTokens = parseInt(minNewTokens)
        if (decodingMethod === 'sample') {
            if (temperature) obj.temperature = parseFloat(temperature)
            if (topP) obj.topP = parseFloat(topP)
            if (topK) obj.topK = parseInt(topK)
        }
        if (stopSequence) {
            obj.stopSequence = stopSequence.split(', ') || ['']
        }
        if (randomSeed) {
            obj.randomSeed = parseInt(randomSeed)
        }
        if (includeStopSequence) {
            obj.includeStopSequence = includeStopSequence
        }

        if (cache) obj.cache = cache

        const watsonXAI = new WatsonxLLM(obj)
        return watsonXAI
    }
}

module.exports = { nodeClass: IBMWatsonx_LLMs }
