import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class TavilyAPI_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    additionalParams: boolean

    constructor() {
        this.label = 'Tavily API'
        this.name = 'tavilyAPI'
        this.version = 1.2
        this.type = 'TavilyAPI'
        this.icon = 'tavily.svg'
        this.category = 'Tools'
        this.description = 'Обертка вокруг TavilyAPI - Специализированная поисковая система, разработанная для LLM и AI агентов'
        this.inputs = [
            {
                label: 'Тема',
                name: 'topic',
                type: 'options',
                options: [
                    { label: 'Общий', name: 'general' },
                    { label: 'Новости', name: 'news' }
                ],
                default: 'general',
                description: 'Категория поиска. Новости для обновлений в реальном времени, общий для более широких поисков',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Глубина поиска',
                name: 'searchDepth',
                type: 'options',
                options: [
                    { label: 'Базовый', name: 'basic' },
                    { label: 'Расширенный', name: 'advanced' }
                ],
                default: 'basic',
                description: 'Глубина поиска. Расширенный стоит 2 API кредита, базовый стоит 1',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Фрагменты на источник',
                name: 'chunksPerSource',
                type: 'number',
                default: 3,
                description: 'Количество фрагментов контента на источник (1-3). Только для расширенного поиска',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Максимум результатов',
                name: 'maxResults',
                type: 'number',
                default: 5,
                additionalParams: true,
                description: 'Максимальное количество результатов поиска (0-20)',
                optional: true
            },
            {
                label: 'Временной диапазон',
                name: 'timeRange',
                type: 'options',
                options: [
                    { label: 'День', name: 'day' },
                    { label: 'Неделя', name: 'week' },
                    { label: 'Месяц', name: 'month' },
                    { label: 'Год', name: 'year' }
                ],
                optional: true,
                additionalParams: true,
                description: 'Временной диапазон для фильтрации результатов'
            },
            {
                label: 'Дни',
                name: 'days',
                type: 'number',
                default: 7,
                additionalParams: true,
                description: 'Количество дней назад от текущей даты (только для темы новостей)',
                optional: true
            },
            {
                label: 'Включить ответ',
                name: 'includeAnswer',
                type: 'boolean',
                default: false,
                description: 'Включить ответ, сгенерированный LLM на запрос',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Включить необработанный контент',
                name: 'includeRawContent',
                type: 'boolean',
                default: false,
                description: 'Включить очищенный и разобранный HTML контент каждого результата',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Включить изображения',
                name: 'includeImages',
                type: 'boolean',
                default: false,
                description: 'Включить результаты поиска изображений',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Включить описания изображений',
                name: 'includeImageDescriptions',
                type: 'boolean',
                default: false,
                description: 'Включить описательный текст для каждого изображения',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Включить домены',
                name: 'includeDomains',
                type: 'string',
                optional: true,
                description: 'Разделенный запятыми список доменов для включения в результаты',
                additionalParams: true
            },
            {
                label: 'Исключить домены',
                name: 'excludeDomains',
                type: 'string',
                optional: true,
                description: 'Разделенный запятыми список доменов для исключения из результатов',
                additionalParams: true
            }
        ]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['tavilyApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(TavilySearchResults)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const tavilyApiKey = getCredentialParam('tavilyApiKey', credentialData, nodeData)

        const topic = nodeData.inputs?.topic as string
        const searchDepth = nodeData.inputs?.searchDepth as string
        const chunksPerSource = nodeData.inputs?.chunksPerSource as number
        const maxResults = nodeData.inputs?.maxResults as number
        const timeRange = nodeData.inputs?.timeRange as string
        const days = nodeData.inputs?.days as number
        const includeAnswer = nodeData.inputs?.includeAnswer as boolean
        const includeRawContent = nodeData.inputs?.includeRawContent as boolean
        const includeImages = nodeData.inputs?.includeImages as boolean
        const includeImageDescriptions = nodeData.inputs?.includeImageDescriptions as boolean
        const includeDomains = nodeData.inputs?.includeDomains as string
        const excludeDomains = nodeData.inputs?.excludeDomains as string

        const config: any = {
            apiKey: tavilyApiKey,
            topic,
            searchDepth,
            maxResults,
            includeAnswer: includeAnswer || undefined,
            includeRawContent: includeRawContent || undefined,
            includeImages: includeImages || undefined,
            includeImageDescriptions: includeImageDescriptions || undefined
        }

        if (chunksPerSource) config.chunksPerSource = chunksPerSource
        if (timeRange) config.timeRange = timeRange
        if (days) config.days = days
        if (includeDomains) config.includeDomains = includeDomains.split(',').map((d) => d.trim())
        if (excludeDomains) config.excludeDomains = excludeDomains.split(',').map((d) => d.trim())

        return new TavilySearchResults(config)
    }
}

module.exports = { nodeClass: TavilyAPI_Tools }
