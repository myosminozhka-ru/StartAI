import axios, { AxiosRequestConfig } from 'axios'
import { omit } from 'lodash'
import { Document } from '@langchain/core/documents'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { ICommonObject, IDocument, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src/utils'

class API_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'API Загрузчик'
        this.name = 'apiLoader'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'api.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из API`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Метод',
                name: 'method',
                type: 'options',
                options: [
                    {
                        label: 'GET',
                        name: 'GET'
                    },
                    {
                        label: 'POST',
                        name: 'POST'
                    }
                ]
            },
            {
                label: 'URL',
                name: 'url',
                type: 'string'
            },
            {
                label: 'Заголовки',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Тело запроса',
                name: 'body',
                type: 'json',
                description:
                    'JSON тело для POST запроса. Если не указано, агент попытается определить его самостоятельно из AIPlugin, если он предоставлен',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Дополнительные метаданные',
                name: 'metadata',
                type: 'json',
                description: 'Дополнительные метаданные, которые будут добавлены к извлеченным документам',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Исключить ключи метаданных',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Каждый загрузчик документов поставляется с набором ключей метаданных по умолчанию, которые извлекаются из документа. Вы можете использовать это поле, чтобы исключить некоторые ключи метаданных по умолчанию. Значение должно быть списком ключей, разделенных запятыми. Используйте * для исключения всех ключей метаданных, кроме тех, которые вы указываете в поле Дополнительные метаданные',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
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
    async init(nodeData: INodeData): Promise<any> {
        const headers = nodeData.inputs?.headers as string
        const url = nodeData.inputs?.url as string
        const body = nodeData.inputs?.body as string
        const method = nodeData.inputs?.method as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const options: ApiLoaderParams = {
            url,
            method
        }

        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(headers)
            options.headers = parsedHeaders
        }

        if (body) {
            const parsedBody = typeof body === 'object' ? body : JSON.parse(body)
            options.body = parsedBody
        }

        const loader = new ApiLoader(options)

        let docs: IDocument[] = []

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

interface ApiLoaderParams {
    url: string
    method: string
    headers?: ICommonObject
    body?: ICommonObject
}

class ApiLoader extends BaseDocumentLoader {
    public readonly url: string

    public readonly headers?: ICommonObject

    public readonly body?: ICommonObject

    public readonly method: string

    constructor({ url, headers, body, method }: ApiLoaderParams) {
        super()
        this.url = url
        this.headers = headers
        this.body = body
        this.method = method
    }

    public async load(): Promise<IDocument[]> {
        if (this.method === 'POST') {
            return this.executePostRequest(this.url, this.headers, this.body)
        } else {
            return this.executeGetRequest(this.url, this.headers)
        }
    }

    protected async executeGetRequest(url: string, headers?: ICommonObject): Promise<IDocument[]> {
        try {
            const config: AxiosRequestConfig = {}
            if (headers) {
                config.headers = headers
            }
            const response = await axios.get(url, config)
            const responseJsonString = JSON.stringify(response.data, null, 2)
            const doc = new Document({
                pageContent: responseJsonString,
                metadata: {
                    url
                }
            })
            return [doc]
        } catch (error) {
            throw new Error(`Не удалось получить данные с ${url}: ${error}`)
        }
    }

    protected async executePostRequest(url: string, headers?: ICommonObject, body?: ICommonObject): Promise<IDocument[]> {
        try {
            const config: AxiosRequestConfig = {}
            if (headers) {
                config.headers = headers
            }
            const response = await axios.post(url, body ?? {}, config)
            const responseJsonString = JSON.stringify(response.data, null, 2)
            const doc = new Document({
                pageContent: responseJsonString,
                metadata: {
                    url
                }
            })
            return [doc]
        } catch (error) {
            throw new Error(`Не удалось отправить данные на ${url}: ${error}`)
        }
    }
}

module.exports = {
    nodeClass: API_DocumentLoaders
}
