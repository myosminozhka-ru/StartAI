import { omit } from 'lodash'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { TextSplitter } from 'langchain/text_splitter'
import { ApifyDatasetLoader } from '@langchain/community/document_loaders/web/apify_dataset'
import { Document } from '@langchain/core/documents'

class ApifyWebsiteContentCrawler_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    version: number
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Apify Веб-краулер контента'
        this.name = 'apifyWebsiteContentCrawler'
        this.type = 'Document'
        this.icon = 'apify-symbol-transparent.svg'
        this.version = 3.0
        this.category = 'Document Loaders'
        this.description = 'Загрузка данных из Apify Website Content Crawler'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключение к Apify API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['apifyApi']
        }
        this.inputs = [
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Начальные URL',
                name: 'urls',
                type: 'string',
                description: 'Один или несколько URL-адресов страниц, с которых начнется краулер, разделенные запятыми.',
                placeholder: 'https://js.langchain.com/docs/'
            },
            {
                label: 'Тип краулера',
                type: 'options',
                name: 'crawlerType',
                options: [
                    {
                        label: 'Браузер без интерфейса (Chrome+Playwright)',
                        name: 'playwright:chrome'
                    },
                    {
                        label: 'Скрытый браузер (Firefox+Playwright)',
                        name: 'playwright:firefox'
                    },
                    {
                        label: 'HTTP-клиент (Cheerio)',
                        name: 'cheerio'
                    },
                    {
                        label: 'HTTP-клиент с выполнением JavaScript (JSDOM) [экспериментально]',
                        name: 'jsdom'
                    }
                ],
                description:
                    'Выберите движок краулера, подробности в <a target="_blank" href="https://apify.com/apify/website-content-crawler#crawling">документации</a>.',
                default: 'playwright:firefox'
            },
            {
                label: 'Максимальная глубина обхода',
                name: 'maxCrawlDepth',
                type: 'number',
                optional: true,
                default: 1,
                additionalParams: true
            },
            {
                label: 'Максимальное количество страниц',
                name: 'maxCrawlPages',
                type: 'number',
                optional: true,
                default: 3,
                additionalParams: true
            },
            {
                label: 'Дополнительные параметры',
                name: 'additionalInput',
                type: 'json',
                default: JSON.stringify({}),
                description:
                    'Для дополнительных параметров краулера см. <a target="_blank" href="https://apify.com/apify/website-content-crawler/input-schema">документацию</a>.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Дополнительные метаданные',
                name: 'metadata',
                type: 'json',
                description: 'Дополнительные метаданные для добавления к извлеченным документам',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Исключить ключи метаданных',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Каждый загрузчик документов имеет стандартный набор ключей метаданных, извлекаемых из документа. Вы можете использовать это поле для исключения некоторых стандартных ключей метаданных. Значение должно быть списком ключей, разделенных запятыми. Используйте * для исключения всех ключей метаданных, кроме тех, которые вы указали в поле Дополнительные метаданные',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документов, содержащих метаданные и содержимое страницы',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Текст',
                name: 'text',
                description: 'Объединенная строка из содержимого страниц документов',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        // Get input options and merge with additional input
        const urls = nodeData.inputs?.urls as string
        const crawlerType = nodeData.inputs?.crawlerType as string
        const maxCrawlDepth = nodeData.inputs?.maxCrawlDepth as string
        const maxCrawlPages = nodeData.inputs?.maxCrawlPages as string
        const additionalInput =
            typeof nodeData.inputs?.additionalInput === 'object'
                ? nodeData.inputs?.additionalInput
                : JSON.parse(nodeData.inputs?.additionalInput as string)
        const input = {
            startUrls: urls.split(',').map((url) => ({ url: url.trim() })),
            crawlerType,
            maxCrawlDepth: parseInt(maxCrawlDepth, 10),
            maxCrawlPages: parseInt(maxCrawlPages, 10),
            ...additionalInput
        }

        // Get Apify API token from credential data
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apifyApiToken = getCredentialParam('apifyApiToken', credentialData, nodeData)

        const loader = await ApifyDatasetLoader.fromActorCall('apify/website-content-crawler', input, {
            datasetMappingFunction: (item) =>
                new Document({
                    pageContent: (item.text || '') as string,
                    metadata: { source: item.url }
                }),
            clientOptions: {
                token: apifyApiToken
            }
        })

        let docs = []

        if (textSplitter) {
            docs = await loader.load()
            docs = await textSplitter.splitDocuments(docs)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {
                              ...parsedMetadata
                          }
                        : omit(
                              {
                                  ...doc.metadata,
                                  ...parsedMetadata
                              },
                              omitMetadataKeys
                          )
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {}
                        : omit(
                              {
                                  ...doc.metadata
                              },
                              omitMetadataKeys
                          )
            }))
        }

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: ApifyWebsiteContentCrawler_DocumentLoaders }
