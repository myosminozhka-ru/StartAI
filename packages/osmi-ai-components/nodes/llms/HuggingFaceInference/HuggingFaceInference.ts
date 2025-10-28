import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { HFInput, HuggingFaceInference } from './core'

class HuggingFaceInference_LLMs implements INode {
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
        this.label = 'HuggingFace Inference'
        this.name = 'huggingFaceInference_LLMs'
        this.version = 2.0
        this.type = 'HuggingFaceInference'
        this.icon = 'HuggingFace.svg'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг больших языковых моделей HuggingFace'
        this.baseClasses = [this.type, ...getBaseClasses(HuggingFaceInference)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['huggingFaceApi']
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
                description: 'Если используете собственный endpoint для вывода, оставьте это поле пустым',
                placeholder: 'gpt2',
                optional: true
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/gpt2',
                description: 'Использование собственного endpoint для вывода',
                optional: true
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр температуры может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Максимальное количество токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description:
                    'Параметр максимального количества токенов может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхняя вероятность',
                name: 'topP',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр верхней вероятности может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхний K',
                name: 'hfTopK',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр верхнего K может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за частоту',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр штрафа за частоту может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const hfTopK = nodeData.inputs?.hfTopK as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const endpoint = nodeData.inputs?.endpoint as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const huggingFaceApiKey = getCredentialParam('huggingFaceApiKey', credentialData, nodeData)

        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<HFInput> = {
            model,
            apiKey: huggingFaceApiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (hfTopK) obj.topK = parseFloat(hfTopK)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (endpoint) obj.endpoint = endpoint

        const huggingFace = new HuggingFaceInference(obj)
        if (cache) huggingFace.cache = cache

        return huggingFace
    }
}

module.exports = { nodeClass: HuggingFaceInference_LLMs }
