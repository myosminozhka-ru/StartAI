import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Replicate, ReplicateInput } from './core'

class Replicate_LLMs implements INode {
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
        this.label = 'Replicate'
        this.name = 'replicate'
        this.version = 2.0
        this.type = 'Replicate'
        this.icon = 'replicate.svg'
        this.category = 'LLMs'
        this.description = 'Использование Replicate для запуска открытых моделей в облаке'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(Replicate)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['replicateApi']
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
                name: 'model',
                type: 'string',
                placeholder: 'a16z-infra/llama13b-v2-chat:df7690f1994d94e96ad9d568eac121aecf50684a0b0963b25a41cc40061269e5',
                optional: true
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description:
                    'Настраивает случайность выходных данных, больше 1 - случайно, а 0 - детерминированно, 0.75 - хорошее начальное значение.',
                default: 0.7,
                optional: true
            },
            {
                label: 'Максимальное количество токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description: 'Максимальное количество токенов для генерации. Слово обычно составляет 2-3 токена',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхняя вероятность',
                name: 'topP',
                type: 'number',
                step: 0.1,
                description:
                    'При декодировании текста выбирает из верхнего p процента наиболее вероятных токенов; уменьшите, чтобы игнорировать менее вероятные токены',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за повторение',
                name: 'repetitionPenalty',
                type: 'number',
                step: 0.1,
                description:
                    'Штраф за повторяющиеся слова в сгенерированном тексте; 1 - без штрафа, значения больше 1 препятствуют повторению, меньше 1 поощряют его. (минимум: 0.01; максимум: 5)',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Дополнительные входы',
                name: 'additionalInputs',
                type: 'json',
                description:
                    'Каждая модель имеет разные параметры, обратитесь к конкретным принятым входам модели. Например: <a target="_blank" href="https://replicate.com/a16z-infra/llama13b-v2-chat/api#inputs">llama13b-v2</a>',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.model as `${string}/${string}` | `${string}/${string}:${string}`
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const repetitionPenalty = nodeData.inputs?.repetitionPenalty as string
        const additionalInputs = nodeData.inputs?.additionalInputs as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('replicateApiKey', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: ReplicateInput & BaseLLMParams = {
            model: modelName,
            apiKey
        }

        let inputs: any = {}
        if (maxTokens) inputs.max_length = parseInt(maxTokens, 10)
        if (temperature) inputs.temperature = parseFloat(temperature)
        if (topP) inputs.top_p = parseFloat(topP)
        if (repetitionPenalty) inputs.repetition_penalty = parseFloat(repetitionPenalty)
        if (additionalInputs) {
            const parsedInputs =
                typeof additionalInputs === 'object' ? additionalInputs : additionalInputs ? JSON.parse(additionalInputs) : {}
            inputs = { ...inputs, ...parsedInputs }
        }
        if (Object.keys(inputs).length) obj.input = inputs

        if (cache) obj.cache = cache

        const model = new Replicate(obj)
        return model
    }
}

module.exports = { nodeClass: Replicate_LLMs }
