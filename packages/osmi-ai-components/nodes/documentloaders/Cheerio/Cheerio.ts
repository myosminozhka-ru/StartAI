import { TextSplitter } from 'langchain/text_splitter'
import { omit } from 'lodash'
import { CheerioWebBaseLoader, WebBaseLoaderParams } from '@langchain/community/document_loaders/web/cheerio'
import { test } from 'linkifyjs'
import { parse } from 'css-what'
import { SelectorType } from 'cheerio'
import { ICommonObject, INodeOutputsValue, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { handleEscapeCharacters, webCrawl, xmlScrape } from '../../../src/utils'

class Cheerio_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Cheerio Веб-скрапер'
        this.name = 'cheerioWebScraper'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'cheerio.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных с веб-страниц`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string'
            },
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Метод получения относительных ссылок',
                name: 'relativeLinksMethod',
                type: 'options',
                description: 'Выберите метод получения относительных ссылок',
                options: [
                    {
                        label: 'Веб-краулинг',
                        name: 'webCrawl',
                        description: 'Обход относительных ссылок из HTML URL'
                    },
                    {
                        label: 'Скрапинг XML карты сайта',
                        name: 'scrapeXMLSitemap',
                        description: 'Извлечение относительных ссылок из URL XML карты сайта'
                    }
                ],
                default: 'webCrawl',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Лимит получения относительных ссылок',
                name: 'limit',
                type: 'number',
                optional: true,
                default: '10',
                additionalParams: true,
                description:
                    'Используется только когда выбран "Метод получения относительных ссылок". Установите 0 для получения всех относительных ссылок, по умолчанию лимит 10.',
                warning: `Получение всех ссылок может занять много времени, и все ссылки будут обновлены, если состояние потока изменится (например: другой URL, размер чанка и т.д.)`
            },
            {
                label: 'Селектор (CSS)',
                name: 'selector',
                type: 'string',
                description: 'Укажите CSS селектор для выбора контента, который нужно извлечь',
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
        const relativeLinksMethod = nodeData.inputs?.relativeLinksMethod as string
        const selectedLinks = nodeData.inputs?.selectedLinks as string[]
        let limit = parseInt(nodeData.inputs?.limit as string)
        const output = nodeData.outputs?.output as string
        const orgId = options.orgId

        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        const selector: SelectorType = nodeData.inputs?.selector as SelectorType

        let params: WebBaseLoaderParams = {}
        if (selector) {
            parse(selector) // comes with cheerio - will throw error if invalid
            params['selector'] = selector
        }

        async function cheerioLoader(url: string): Promise<any> {
            try {
                let docs: IDocument[] = []
                if (url.endsWith('.pdf')) {
                    if (process.env.DEBUG === 'true')
                        options.logger.info(`[${orgId}]: CheerioWebBaseLoader does not support PDF files: ${url}`)
                    return docs
                }
                const loader = new CheerioWebBaseLoader(url, params)
                if (textSplitter) {
                    docs = await loader.load()
                    docs = await textSplitter.splitDocuments(docs)
                } else {
                    docs = await loader.load()
                }
                return docs
            } catch (err) {
                if (process.env.DEBUG === 'true')
                    options.logger.error(`[${orgId}]: Error in CheerioWebBaseLoader: ${err.message}, on page: ${url}`)
                return []
            }
        }

        let docs: IDocument[] = []

        if (relativeLinksMethod) {
            if (process.env.DEBUG === 'true') options.logger.info(`[${orgId}]: Start CheerioWebBaseLoader ${relativeLinksMethod}`)
            // if limit is 0 we don't want it to default to 10 so we check explicitly for null or undefined
            // so when limit is 0 we can fetch all the links
            if (limit === null || limit === undefined) limit = 10
            else if (limit < 0) throw new Error('Limit cannot be less than 0')
            const pages: string[] =
                selectedLinks && selectedLinks.length > 0
                    ? selectedLinks.slice(0, limit === 0 ? undefined : limit)
                    : relativeLinksMethod === 'webCrawl'
                    ? await webCrawl(url, limit)
                    : await xmlScrape(url, limit)
            if (process.env.DEBUG === 'true')
                options.logger.info(`[${orgId}]: CheerioWebBaseLoader pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            if (!pages || pages.length === 0) throw new Error('No relative links found')
            for (const page of pages) {
                docs.push(...(await cheerioLoader(page)))
            }
            if (process.env.DEBUG === 'true') options.logger.info(`[${orgId}]: Finish CheerioWebBaseLoader ${relativeLinksMethod}`)
        } else if (selectedLinks && selectedLinks.length > 0) {
            if (process.env.DEBUG === 'true')
                options.logger.info(
                    `[${orgId}]: CheerioWebBaseLoader pages: ${JSON.stringify(selectedLinks)}, length: ${selectedLinks.length}`
                )
            for (const page of selectedLinks.slice(0, limit)) {
                docs.push(...(await cheerioLoader(page)))
            }
        } else {
            docs = await cheerioLoader(url)
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

module.exports = { nodeClass: Cheerio_DocumentLoaders }
