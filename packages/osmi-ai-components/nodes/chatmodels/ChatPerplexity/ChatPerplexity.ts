import { ChatPerplexity as LangchainChatPerplexity, PerplexityChatInput } from '@langchain/community/chat_models/perplexity'
import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ChatPerplexity } from './OSMIChatPerplexity'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class ChatPerplexity_ChatModels implements INode {
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
        this.label = 'ChatPerplexity'
        this.name = 'chatPerplexity'
        this.version = 0.1
        this.type = 'ChatPerplexity'
        this.icon = 'perplexity.svg'
        this.category = 'Chat Models'
        this.description = 'Обертка вокруг больших языковых моделей Perplexity, использующих Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainChatPerplexity)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['perplexityApi']
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
                name: 'model',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'sonar'
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 1,
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
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за присутствие',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за частоту',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
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
                label: 'Таймаут',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            // {
            //     label: 'Фильтр домена поиска',
            //     name: 'searchDomainFilter',
            //     type: 'json',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Ограничить цитирования URL-адресами из указанных доменов (например, ["example.com", "anotherexample.org"])'
            // },
            // В настоящее время отключено, так как вывод сохраняется как additional_kwargs
            // {
            //     label: 'Возвращать изображения',
            //     name: 'returnImages',
            //     type: 'boolean',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Должна ли модель возвращать изображения (если поддерживается моделью)'
            // },
            // В настоящее время отключено, так как вывод сохраняется как additional_kwargs
            // {
            //     label: 'Возвращать связанные вопросы',
            //     name: 'returnRelatedQuestions',
            //     type: 'boolean',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Должна ли онлайн-модель возвращать связанные вопросы'
            // },
            // {
            //     label: 'Фильтр актуальности поиска',
            //     name: 'searchRecencyFilter',
            //     type: 'options',
            //     options: [
            //         { label: 'Не установлено', name: '' },
            //         { label: 'Месяц', name: 'month' },
            //         { label: 'Неделя', name: 'week' },
            //         { label: 'День', name: 'day' },
            //         { label: 'Час', name: 'hour' }
            //     ],
            //     default: '',
            //     optional: true,
            //     additionalParams: true,
            //     description: 'Фильтровать результаты поиска по временному интервалу (не применяется к изображениям)'
            // },
            {
                label: 'URL прокси',
                name: 'proxyUrl',
                type: 'string',
                optional: true,
                additionalParams: true
            }
            // LangchainJS в настоящее время не имеет параметра web_search_options, search_after_date_filter или search_before_date_filter.
            // Чтобы добавить web_search_options (user_location, search_context_size) и search_after_date_filter, search_before_date_filter как параметр modelKwargs.
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatPerplexity')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model as string
        const temperature = nodeData.inputs?.temperature as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const streaming = nodeData.inputs?.streaming as boolean
        const timeout = nodeData.inputs?.timeout as string
        const searchDomainFilterRaw = nodeData.inputs?.searchDomainFilter
        const returnImages = nodeData.inputs?.returnImages as boolean
        const returnRelatedQuestions = nodeData.inputs?.returnRelatedQuestions as boolean
        const searchRecencyFilter = nodeData.inputs?.searchRecencyFilter as string
        const proxyUrl = nodeData.inputs?.proxyUrl as string
        const cache = nodeData.inputs?.cache as BaseCache

        if (nodeData.inputs?.credentialId) {
            nodeData.credential = nodeData.inputs?.credentialId
        }
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('perplexityApiKey', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('Perplexity API Key missing from credential')
        }

        const obj: PerplexityChatInput = {
            model,
            apiKey,
            streaming: streaming ?? true
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (topK) obj.topK = parseInt(topK, 10)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        if (returnImages) obj.returnImages = returnImages
        if (returnRelatedQuestions) obj.returnRelatedQuestions = returnRelatedQuestions
        if (searchRecencyFilter && searchRecencyFilter !== '') obj.searchRecencyFilter = searchRecencyFilter
        if (cache) obj.cache = cache

        if (searchDomainFilterRaw) {
            try {
                obj.searchDomainFilter =
                    typeof searchDomainFilterRaw === 'object' ? searchDomainFilterRaw : JSON.parse(searchDomainFilterRaw)
            } catch (exception) {
                throw new Error('Invalid JSON in Search Domain Filter: ' + exception)
            }
        }

        if (proxyUrl) {
            console.warn('Proxy configuration for ChatPerplexity might require adjustments to OSMI ChatPerplexity wrapper.')
        }

        const perplexityModel = new ChatPerplexity(nodeData.id, obj)
        return perplexityModel
    }
}

module.exports = { nodeClass: ChatPerplexity_ChatModels }
