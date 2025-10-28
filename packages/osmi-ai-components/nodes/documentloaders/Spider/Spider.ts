import { omit } from 'lodash'
import { TextSplitter } from 'langchain/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import SpiderApp from './SpiderApp'

interface SpiderLoaderParameters {
    url: string
    apiKey?: string
    mode?: 'crawl' | 'scrape'
    limit?: number
    additionalMetadata?: Record<string, unknown>
    params?: Record<string, unknown>
}

class SpiderLoader extends BaseDocumentLoader {
    private apiKey: string
    private url: string
    private mode: 'crawl' | 'scrape'
    private limit?: number
    private additionalMetadata?: Record<string, unknown>
    private params?: Record<string, unknown>

    constructor(loaderParams: SpiderLoaderParameters) {
        super()
        const { apiKey, url, mode = 'crawl', limit, additionalMetadata, params } = loaderParams
        if (!apiKey) {
            throw new Error(
                'API ключ Spider не установлен. Вы можете установить его как SPIDER_API_KEY в вашем файле .env или передать в Spider.'
            )
        }

        this.apiKey = apiKey
        this.url = url
        this.mode = mode
        this.limit = Number(limit)
        this.additionalMetadata = additionalMetadata
        this.params = params
    }

    public async load(): Promise<DocumentInterface[]> {
        const app = new SpiderApp({ apiKey: this.apiKey })
        let spiderDocs: any[]

        if (this.mode === 'scrape') {
            const response = await app.scrapeUrl(this.url, this.params)
            if (!response.success) {
                throw new Error(`Spider: Не удалось сканировать URL. Ошибка: ${response.error}`)
            }
            spiderDocs = [response.data]
        } else if (this.mode === 'crawl') {
            if (this.params) {
                this.params.limit = this.limit
            }
            const response = await app.crawlUrl(this.url, this.params)
            if (!response.success) {
                throw new Error(`Spider: Не удалось обойти URL. Ошибка: ${response.error}`)
            }
            spiderDocs = response.data
        } else {
            throw new Error(`Неизвестный режим '${this.mode}'. Ожидается один из: 'crawl', 'scrape'.`)
        }

        return spiderDocs.map(
            (doc) =>
                new Document({
                    pageContent: doc.content || '',
                    metadata: {
                        ...(this.additionalMetadata || {}),
                        source: doc.url
                    }
                })
        )
    }
}

class Spider_DocumentLoaders implements INode {
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
        this.label = 'Загрузчик документов Spider'
        this.name = 'spiderDocumentLoaders'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'spider.svg'
        this.category = 'Document Loaders'
        this.description = 'Сканирование и обход веб-страниц с помощью Spider'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Режим',
                name: 'mode',
                type: 'options',
                options: [
                    {
                        label: 'Сканирование',
                        name: 'scrape',
                        description: 'Сканирование отдельной страницы'
                    },
                    {
                        label: 'Обход',
                        name: 'crawl',
                        description: 'Обход веб-сайта и извлечение страниц в пределах одного домена'
                    }
                ],
                default: 'scrape'
            },
            {
                label: 'URL веб-страницы',
                name: 'url',
                type: 'string',
                placeholder: 'https://spider.cloud'
            },
            {
                label: 'Лимит',
                name: 'limit',
                type: 'number',
                default: 25
            },
            {
                label: 'Дополнительные метаданные',
                name: 'additional_metadata',
                type: 'json',
                description: 'Дополнительные метаданные, которые будут добавлены к извлеченным документам',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Дополнительные параметры',
                name: 'params',
                description:
                    'Найдите все доступные параметры в <a _target="blank" href="https://spider.cloud/docs/api">документации API Spider</a>',
                additionalParams: true,
                placeholder: '{ "anti_bot": true }',
                type: 'json',
                optional: true
            },
            {
                label: 'Исключить ключи метаданных',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Каждый загрузчик документов поставляется с набором метаданных по умолчанию, которые извлекаются из документа. Вы можете использовать это поле для исключения некоторых ключей метаданных по умолчанию. Значение должно быть списком ключей, разделенных запятыми. Используйте * для исключения всех ключей метаданных, кроме тех, которые вы указали в поле Дополнительные метаданные',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.credential = {
            label: 'Учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['spiderApi']
        }
        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документа, содержащих метаданные и содержимое страницы',
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
        const url = nodeData.inputs?.url as string
        const mode = nodeData.inputs?.mode as 'crawl' | 'scrape'
        const limit = nodeData.inputs?.limit as number
        let additionalMetadata = nodeData.inputs?.additional_metadata
        let params = nodeData.inputs?.params || {}
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const spiderApiKey = getCredentialParam('spiderApiKey', credentialData, nodeData)
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        if (typeof params === 'string') {
            try {
                params = JSON.parse(params)
            } catch (e) {
                console.error('Предоставлена некорректная JSON строка для параметров')
            }
        }

        if (additionalMetadata) {
            if (typeof additionalMetadata === 'string') {
                try {
                    additionalMetadata = JSON.parse(additionalMetadata)
                } catch (e) {
                    console.error('Предоставлена некорректная JSON строка для дополнительных метаданных')
                }
            } else if (typeof additionalMetadata !== 'object') {
                console.error('Дополнительные метаданные должны быть корректным JSON объектом')
            }
        } else {
            additionalMetadata = {}
        }

        // Ensure return_format is set to markdown
        params.return_format = 'markdown'

        const input: SpiderLoaderParameters = {
            url,
            mode: mode as 'crawl' | 'scrape',
            apiKey: spiderApiKey,
            limit: limit as number,
            additionalMetadata: additionalMetadata as Record<string, unknown>,
            params: params as Record<string, unknown>
        }

        const loader = new SpiderLoader(input)

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        docs = docs.map((doc: DocumentInterface) => ({
            ...doc,
            metadata:
                _omitMetadataKeys === '*'
                    ? additionalMetadata
                    : omit(
                          {
                              ...doc.metadata,
                              ...additionalMetadata
                          },
                          omitMetadataKeys
                      )
        }))

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

module.exports = { nodeClass: Spider_DocumentLoaders }
