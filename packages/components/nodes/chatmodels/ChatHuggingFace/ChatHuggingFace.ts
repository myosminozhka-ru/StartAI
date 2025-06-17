import { BaseCache } from '@langchain/core/caches'
import { HFInput, HuggingFaceInference } from './core'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class ChatHuggingFace_ChatModels implements INode {
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
        this.label = 'ChatHuggingFace'
        this.name = 'chatHuggingFace'
        this.version = 3.0
        this.type = 'ChatHuggingFace'
        this.icon = 'HuggingFace.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around HuggingFace large language models'
        this.baseClasses = [this.type, 'BaseChatModel', ...getBaseClasses(HuggingFaceInference)]
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
                description: 'Если используете собственный endpoint для инференса, оставьте это поле пустым',
                placeholder: 'gpt2'
            },
            {
                label: 'Endpoint',
                name: 'endpoint',
                type: 'string',
                placeholder: 'https://xyz.eu-west-1.aws.endpoints.huggingface.cloud/gpt2',
                description: 'Использование собственного endpoint для инференса',
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
                label: 'Максимум токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                description:
                    'Параметр максимального количества токенов может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Вероятность Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр Top Probability может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'hfTopK',
                type: 'number',
                step: 0.1,
                description: 'Параметр Top K может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф частоты',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр штрафа частоты может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Стоп-последовательность',
                name: 'stop',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description:
                    'Устанавливает стоп-последовательности для использования. Используйте запятую для разделения различных последовательностей.',
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
        const cache = nodeData.inputs?.cache as BaseCache
        const stop = nodeData.inputs?.stop as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const huggingFaceApiKey = getCredentialParam('huggingFaceApiKey', credentialData, nodeData)

        const obj: Partial<HFInput> = {
            model,
            apiKey: huggingFaceApiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (hfTopK) obj.topK = parseFloat(hfTopK)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (endpoint) obj.endpointUrl = endpoint
        if (stop) {
            const stopSequences = stop.split(',')
            obj.stopSequences = stopSequences
        }

        const huggingFace = new HuggingFaceInference(obj)
        if (cache) huggingFace.cache = cache
        return huggingFace
    }
}

module.exports = { nodeClass: ChatHuggingFace_ChatModels }
