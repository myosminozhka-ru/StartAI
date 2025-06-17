import { BaseCache } from '@langchain/core/caches'
import { ChatWatsonx, ChatWatsonxInput } from '@langchain/community/chat_models/ibm'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

interface WatsonxAuth {
    watsonxAIApikey?: string
    watsonxAIBearerToken?: string
    watsonxAIUsername?: string
    watsonxAIPassword?: string
    watsonxAIUrl?: string
    watsonxAIAuthType?: string
}

class ChatIBMWatsonx_ChatModels implements INode {
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
        this.label = 'ChatIBMWatsonx'
        this.name = 'chatIBMWatsonx'
        this.version = 2.0
        this.type = 'ChatIBMWatsonx'
        this.icon = 'ibm.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around IBM watsonx.ai foundation models'
        this.baseClasses = [this.type, ...getBaseClasses(ChatWatsonx)]
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
                name: 'modelName',
                type: 'string',
                placeholder: 'mistralai/mistral-large'
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
                label: 'Штраф частоты',
                name: 'frequencyPenalty',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true,
                description:
                    'Положительные значения штрафуют новые токены на основе их существующей частоты в тексте, уменьшая вероятность того, что модель повторит ту же строку дословно.'
            },
            {
                label: 'Логарифм вероятностей',
                name: 'logprobs',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true,
                description:
                    'Возвращать ли логарифмы вероятностей выходных токенов или нет. Если true, возвращает логарифмы вероятностей каждого выходного токена, возвращенного в содержимом сообщения.'
            },
            {
                label: 'N',
                name: 'n',
                type: 'number',
                step: 1,
                default: 1,
                optional: true,
                additionalParams: true,
                description:
                    'Сколько вариантов завершения чата генерировать для каждого входного сообщения. Обратите внимание, что вы будете платить на основе количества сгенерированных токенов по всем вариантам. Держите n равным 1, чтобы минимизировать затраты.'
            },
            {
                label: 'Штраф присутствия',
                name: 'presencePenalty',
                type: 'number',
                step: 1,
                default: 1,
                optional: true,
                additionalParams: true,
                description:
                    'Положительные значения штрафуют новые токены на основе того, появляются ли они в тексте, увеличивая вероятность того, что модель будет говорить о новых темах.'
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                default: 0.1,
                optional: true,
                additionalParams: true,
                description:
                    'Альтернатива сэмплингу с температурой, называемая ядерным сэмплингом, где модель рассматривает результаты токенов с вероятностной массой top_p. Так что 0.1 означает, что рассматриваются только токены, составляющие верхние 10% вероятностной массы.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const cache = nodeData.inputs?.cache as BaseCache
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const logprobs = nodeData.inputs?.logprobs as boolean
        const n = nodeData.inputs?.n as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const topP = nodeData.inputs?.topP as string
        const streaming = nodeData.inputs?.streaming as boolean

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

        const obj = {
            ...auth,
            streaming: streaming ?? true,
            model: modelName,
            temperature: temperature ? parseFloat(temperature) : undefined
        } as ChatWatsonxInput & WatsonxAuth

        if (cache) obj.cache = cache
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (frequencyPenalty) obj.frequencyPenalty = parseInt(frequencyPenalty, 10)
        if (logprobs) obj.logprobs = logprobs
        if (n) obj.maxTokens = parseInt(n, 10)
        if (presencePenalty) obj.presencePenalty = parseInt(presencePenalty, 10)
        if (topP) obj.topP = parseFloat(topP)

        const model = new ChatWatsonx(obj)
        return model
    }
}

module.exports = { nodeClass: ChatIBMWatsonx_ChatModels }
