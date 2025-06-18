import { ExaSearchResults } from '@langchain/exa'
import Exa from 'exa-js'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const DESC = `A wrapper around Exa Search. Input should be an Exa-optimized query. Output is a JSON array of the query results`

class ExaSearch_Tools implements INode {
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

    constructor() {
        this.label = 'Exa Search'
        this.name = 'exaSearch'
        this.version = 1.1
        this.type = 'ExaSearch'
        this.icon = 'exa.svg'
        this.category = 'Tools'
        this.description = 'Обертка вокруг Exa Search API - поисковая система, полностью разработанная для использования LLM'
        this.inputs = [
            {
                label: 'Описание инструмента',
                name: 'description',
                type: 'string',
                description: 'Описание того, что делает инструмент. Это для LLM, чтобы определить, когда использовать этот инструмент.',
                rows: 4,
                additionalParams: true,
                default: DESC
            },
            {
                label: 'Количество результатов',
                name: 'numResults',
                type: 'number',
                optional: true,
                step: 1,
                additionalParams: true,
                description:
                    'Количество результатов поиска для возврата. По умолчанию 10. Максимум 10 для базовых планов. До тысяч для пользовательских планов.'
            },
            {
                label: 'Тип поиска',
                name: 'type',
                type: 'options',
                options: [
                    {
                        label: 'keyword',
                        name: 'keyword'
                    },
                    {
                        label: 'neural',
                        name: 'neural'
                    },
                    {
                        label: 'auto',
                        name: 'auto',
                        description: 'decides between keyword and neural'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Использовать авто-промпт',
                name: 'useAutoprompt',
                type: 'boolean',
                optional: true,
                additionalParams: true,
                description: 'Если true, ваш запрос будет преобразован в Exa запрос. По умолчанию false.'
            },
            {
                label: 'Категория (Бета)',
                name: 'category',
                type: 'options',
                description:
                    'Категория данных для фокусировки, с более высокой полнотой и чистотой данных. Категории сейчас включают company, research paper, news, github, tweet, movie, song, personal site, и pdf',
                options: [
                    {
                        label: 'company',
                        name: 'company'
                    },
                    {
                        label: 'research paper',
                        name: 'research paper'
                    },
                    {
                        label: 'news',
                        name: 'news'
                    },
                    {
                        label: 'github',
                        name: 'github'
                    },
                    {
                        label: 'tweet',
                        name: 'tweet'
                    },
                    {
                        label: 'movie',
                        name: 'movie'
                    },
                    {
                        label: 'song',
                        name: 'song'
                    },
                    {
                        label: 'pdf',
                        name: 'pdf'
                    },
                    {
                        label: 'personal site',
                        name: 'personal site'
                    },
                    {
                        label: 'linkedin profile',
                        name: 'linkedin profile'
                    },
                    {
                        label: 'financial report',
                        name: 'financial report'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Включить домены',
                name: 'includeDomains',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true,
                description:
                    'Список доменов для включения в поиск, разделенных запятыми. Если указано, результаты будут только с этих доменов.'
            },
            {
                label: 'Исключить домены',
                name: 'excludeDomains',
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true,
                description:
                    'Список доменов для исключения из поиска, разделенных запятыми. Если указано, результаты не будут включать ни одного из этих доменов.'
            },
            {
                label: 'Дата начала краулинга',
                name: 'startCrawlDate',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: '2023-01-01T00:00:00.000Z',
                description:
                    'Дата краулинга относится к дате, когда Exa обнаружил ссылку. Результаты будут включать ссылки, которые были просканированы после этой даты. Должно быть указано в формате ISO 8601.'
            },
            {
                label: 'Дата окончания краулинга',
                name: 'endCrawlDate',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: '2023-12-31T00:00:00.000Z',
                description:
                    'Дата краулинга относится к дате, когда Exa обнаружил ссылку. Результаты будут включать ссылки, которые были просканированы до этой даты. Должно быть указано в формате ISO 8601.'
            },
            {
                label: 'Дата начала публикации',
                name: 'startPublishedDate',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: '2023-01-01T00:00:00.000Z',
                description: 'Только ссылки с датой публикации после этой будут возвращены. Должно быть указано в формате ISO 8601.'
            },
            {
                label: 'Дата окончания публикации',
                name: 'endPublishedDate',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: '2023-12-31T00:00:00.000Z',
                description: 'Только ссылки с датой публикации до этой будут возвращены. Должно быть указано в формате ISO 8601.'
            }
        ]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['exaSearchApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(ExaSearchResults)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const description = nodeData.inputs?.description as string
        const numResults = nodeData.inputs?.numResults as string
        const type = nodeData.inputs?.type as 'keyword' | 'neural' | 'auto' | undefined
        const useAutoprompt = nodeData.inputs?.useAutoprompt as boolean
        const category = nodeData.inputs?.category as string
        const includeDomains = nodeData.inputs?.includeDomains as string
        const excludeDomains = nodeData.inputs?.excludeDomains as string
        const startCrawlDate = nodeData.inputs?.startCrawlDate as string
        const endCrawlDate = nodeData.inputs?.endCrawlDate as string
        const startPublishedDate = nodeData.inputs?.startPublishedDate as string
        const endPublishedDate = nodeData.inputs?.endPublishedDate as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const exaSearchApiKey = getCredentialParam('exaSearchApiKey', credentialData, nodeData)

        const tool = new ExaSearchResults({
            client: new Exa(exaSearchApiKey),
            searchArgs: {
                numResults: numResults ? parseFloat(numResults) : undefined,
                type: type || undefined,
                useAutoprompt: useAutoprompt || undefined,
                category: (category as any) || undefined,
                includeDomains: includeDomains ? includeDomains.split(',') : undefined,
                excludeDomains: excludeDomains ? excludeDomains.split(',') : undefined,
                startCrawlDate: startCrawlDate || undefined,
                endCrawlDate: endCrawlDate || undefined,
                startPublishedDate: startPublishedDate || undefined,
                endPublishedDate: endPublishedDate || undefined
            }
        })

        if (description) tool.description = description

        return tool
    }
}

module.exports = { nodeClass: ExaSearch_Tools }
