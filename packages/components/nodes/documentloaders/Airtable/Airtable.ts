import axios from 'axios'
import { omit } from 'lodash'
import { Document } from '@langchain/core/documents'
import { TextSplitter } from 'langchain/text_splitter'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { IDocument, ICommonObject, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src'

class Airtable_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Airtable'
        this.name = 'airtable'
        this.version = 3.02
        this.type = 'Document'
        this.icon = 'airtable.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из таблицы Airtable`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['airtableApi']
        }
        this.inputs = [
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'ID базы',
                name: 'baseId',
                type: 'string',
                placeholder: 'app11RobdGoX0YNsC',
                description:
                    'Если URL вашей таблицы выглядит так: https://airtable.com/app11RobdGoX0YNsC/tblJdmvbrgizbYICO/viw9UrP77Id0CE4ee, то app11RovdGoX0YNsC - это ID базы'
            },
            {
                label: 'ID таблицы',
                name: 'tableId',
                type: 'string',
                placeholder: 'tblJdmvbrgizbYICO',
                description:
                    'Если URL вашей таблицы выглядит так: https://airtable.com/app11RobdGoX0YNsC/tblJdmvbrgizbYICO/viw9UrP77Id0CE4ee, то tblJdmvbrgizbYICO - это ID таблицы'
            },
            {
                label: 'ID представления',
                name: 'viewId',
                type: 'string',
                placeholder: 'viw9UrP77Id0CE4ee',
                description:
                    'Если URL вашего представления выглядит так: https://airtable.com/app11RobdGoX0YNsC/tblJdmvbrgizbYICO/viw9UrP77Id0CE4ee, то viw9UrP77Id0CE4ee - это ID представления',
                optional: true
            },
            {
                label: 'Включить только поля',
                name: 'fields',
                type: 'string',
                placeholder: 'Name, Assignee, fld1u0qUz0SoOQ9Gg, fldew39v6LBN5CjUl',
                optional: true,
                additionalParams: true,
                description:
                    'Список имен или ID полей через запятую для включения. Если пусто, используются ВСЕ поля. Используйте ID полей, если имена полей содержат запятые.'
            },
            {
                label: 'Вернуть все',
                name: 'returnAll',
                type: 'boolean',
                optional: true,
                default: true,
                additionalParams: true,
                description: 'Если должны быть возвращены все результаты или только до указанного лимита'
            },
            {
                label: 'Лимит',
                name: 'limit',
                type: 'number',
                optional: true,
                default: 100,
                additionalParams: true,
                description: 'Количество результатов для возврата. Игнорируется, когда включен параметр "Вернуть все".'
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
                    'Каждый загрузчик документов поставляется с набором ключей метаданных по умолчанию, которые извлекаются из документа. Вы можете использовать это поле, чтобы исключить некоторые ключи метаданных по умолчанию. Значение должно быть списком ключей, разделенных запятыми. Используйте * для исключения всех ключей метаданных, кроме тех, которые вы указали в поле "Дополнительные метаданные"',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Фильтр по формуле',
                name: 'filterByFormula',
                type: 'string',
                placeholder: 'NOT({Id} = "")',
                optional: true,
                additionalParams: true,
                description:
                    'Формула для фильтрации записей. Формула будет вычислена для каждой записи, и если результат не равен 0, false, "", NaN, [] или #Error!, запись будет включена в ответ.'
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
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const baseId = nodeData.inputs?.baseId as string
        const tableId = nodeData.inputs?.tableId as string
        const viewId = nodeData.inputs?.viewId as string
        const fieldsInput = nodeData.inputs?.fields as string
        const fields = fieldsInput ? fieldsInput.split(',').map((field) => field.trim()) : []
        const returnAll = nodeData.inputs?.returnAll as boolean
        const limit = nodeData.inputs?.limit as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const filterByFormula = nodeData.inputs?.filterByFormula as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const airtableOptions: AirtableLoaderParams = {
            baseId,
            tableId,
            viewId,
            fields,
            returnAll,
            accessToken,
            limit: limit ? parseInt(limit, 10) : 100,
            filterByFormula
        }

        const loader = new AirtableLoader(airtableOptions)

        if (!baseId || !tableId) {
            throw new Error('Необходимо указать ID базы и ID таблицы.')
        }

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

        const output = nodeData.outputs?.output as string

        if (output === 'text') {
            let finalText = ''
            for (const doc of docs) {
                finalText += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finalText, false)
        }

        return docs
    }
}

interface AirtableLoaderParams {
    baseId: string
    tableId: string
    accessToken: string
    viewId?: string
    fields?: string[]
    limit?: number
    returnAll?: boolean
    filterByFormula?: string
}

interface AirtableLoaderRequest {
    maxRecords?: number
    view: string | undefined
    fields?: string[]
    offset?: string
    filterByFormula?: string
}

interface AirtableLoaderResponse {
    records: AirtableLoaderPage[]
    offset?: string
}

interface AirtableLoaderPage {
    id: string
    createdTime: string
    fields: ICommonObject
}

class AirtableLoader extends BaseDocumentLoader {
    public readonly baseId: string

    public readonly tableId: string

    public readonly viewId?: string

    public readonly fields: string[]

    public readonly accessToken: string

    public readonly limit: number

    public readonly returnAll: boolean

    public readonly filterByFormula?: string

    constructor({
        baseId,
        tableId,
        viewId,
        fields = [],
        accessToken,
        limit = 100,
        returnAll = false,
        filterByFormula
    }: AirtableLoaderParams) {
        super()
        this.baseId = baseId
        this.tableId = tableId
        this.viewId = viewId
        this.fields = fields
        this.accessToken = accessToken
        this.limit = limit
        this.returnAll = returnAll
        this.filterByFormula = filterByFormula
    }

    public async load(): Promise<IDocument[]> {
        if (this.returnAll) {
            return this.loadAll()
        }
        return this.loadLimit()
    }

    protected async fetchAirtableData(url: string, data: AirtableLoaderRequest): Promise<AirtableLoaderResponse> {
        try {
            const headers = {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
            const response = await axios.post(url, data, { headers })
            return response.data
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Не удалось получить данные из Airtable (${url}): ${error.message}, статус: ${error.response?.status}`)
            } else {
                throw new Error(`Не удалось получить данные из Airtable (${url}): ${error}`)
            }
        }
    }

    private createDocumentFromPage(page: AirtableLoaderPage): IDocument {
        // Generate the URL
        const pageUrl = `https://api.airtable.com/v0/${this.baseId}/${this.tableId}/${page.id}`

        // Return a langchain document
        return new Document({
            pageContent: JSON.stringify(page.fields, null, 2),
            metadata: {
                url: pageUrl
            }
        })
    }

    private async loadLimit(): Promise<IDocument[]> {
        let data: AirtableLoaderRequest = {
            maxRecords: this.limit,
            view: this.viewId
        }

        if (this.fields.length > 0) {
            data.fields = this.fields
        }

        if (this.filterByFormula) {
            data.filterByFormula = this.filterByFormula
        }

        let response: AirtableLoaderResponse
        let returnPages: AirtableLoaderPage[] = []

        // Paginate if the user specifies a limit > 100 (like 200) but not return all.
        do {
            response = await this.fetchAirtableData(`https://api.airtable.com/v0/${this.baseId}/${this.tableId}/listRecords`, data)
            returnPages.push(...response.records)
            data.offset = response.offset

            // Stop if we have fetched enough records
            if (returnPages.length >= this.limit) break
        } while (response.offset !== undefined)

        // Truncate array to the limit if necessary
        if (returnPages.length > this.limit) {
            returnPages.length = this.limit
        }

        return returnPages.map((page) => this.createDocumentFromPage(page))
    }

    private async loadAll(): Promise<IDocument[]> {
        let data: AirtableLoaderRequest = {
            view: this.viewId
        }

        if (this.fields.length > 0) {
            data.fields = this.fields
        }

        if (this.filterByFormula) {
            data.filterByFormula = this.filterByFormula
        }

        let response: AirtableLoaderResponse
        let returnPages: AirtableLoaderPage[] = []

        do {
            response = await this.fetchAirtableData(`https://api.airtable.com/v0/${this.baseId}/${this.tableId}/listRecords`, data)
            returnPages.push(...response.records)
            data.offset = response.offset
        } while (response.offset !== undefined)
        return returnPages.map((page) => this.createDocumentFromPage(page))
    }
}

module.exports = {
    nodeClass: Airtable_DocumentLoaders
}
