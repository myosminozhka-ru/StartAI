import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { getFileFromStorage, handleEscapeCharacters, INodeOutputsValue } from '../../../src'
import { Document } from '@langchain/core/documents'
import jsonpointer from 'jsonpointer'
import type { readFile as ReadFileT } from 'node:fs/promises'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'

const howToUseCode = `
Вы можете динамически добавлять метаданные из документа:

Например, если JSON документ выглядит так:
\`\`\`json
[
    {
        "url": "https://www.google.com",
        "body": "This is body 1"
    },
    {
        "url": "https://www.yahoo.com",
        "body": "This is body 2"
    }
]

\`\`\`

Вы можете использовать значение "url" как метаданные, вернув следующее:
\`\`\`json
{
    "url": "/url"
}
\`\`\``

class Json_DocumentLoaders implements INode {
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
        this.label = 'JSON файл'
        this.name = 'jsonFile'
        this.version = 3.0
        this.type = 'Document'
        this.icon = 'json.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из JSON файлов`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'JSON файл',
                name: 'jsonFile',
                type: 'file',
                fileType: '.json'
            },
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Указатели извлечения (разделенные запятыми)',
                name: 'pointersName',
                type: 'string',
                description:
                    'Пример: { "key": "value" }, Указатель извлечения = "key", "value" будет извлечен как содержимое страницы фрагмента. Используйте запятую для разделения нескольких указателей',
                placeholder: 'key1, key2',
                optional: true
            },
            {
                label: 'Дополнительные метаданные',
                name: 'metadata',
                type: 'json',
                description:
                    'Дополнительные метаданные для добавления к извлеченным документам. Вы можете динамически добавлять метаданные из документа. Пример: { "key": "value", "source": "www.example.com" }. Метаданные: { "page": "/source" } извлечет значение ключа "source" из документа и добавит его в метаданные с ключом "page"',
                hint: {
                    label: 'Как использовать',
                    value: howToUseCode
                },
                optional: true,
                additionalParams: true
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
        const jsonFileBase64 = nodeData.inputs?.jsonFile as string
        const pointersName = nodeData.inputs?.pointersName as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let pointers: string[] = []
        if (pointersName) {
            const outputString = pointersName.replace(/[^a-zA-Z0-9,]+/g, ',')
            pointers = outputString.split(',').map((pointer) => '/' + pointer.trim())
        }

        let docs: IDocument[] = []
        let files: string[] = []

        //FILE-STORAGE::["CONTRIBUTING.md","LICENSE.md","README.md"]
        if (jsonFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = jsonFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const orgId = options.orgId
            const chatflowid = options.chatflowid

            for (const file of files) {
                if (!file) continue
                const fileData = await getFileFromStorage(file, orgId, chatflowid)
                const blob = new Blob([fileData as BlobPart])
                const loader = new JSONLoader(blob, pointers.length != 0 ? pointers : undefined, metadata)

                if (textSplitter) {
                    let splittedDocs = await loader.load()
                    splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                    docs.push(...splittedDocs)
                } else {
                    docs.push(...(await loader.load()))
                }
            }
        } else {
            if (jsonFileBase64.startsWith('[') && jsonFileBase64.endsWith(']')) {
                files = JSON.parse(jsonFileBase64)
            } else {
                files = [jsonFileBase64]
            }

            for (const file of files) {
                if (!file) continue
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                const loader = new JSONLoader(blob, pointers.length != 0 ? pointers : undefined, metadata)

                if (textSplitter) {
                    let splittedDocs = await loader.load()
                    splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                    docs.push(...splittedDocs)
                } else {
                    docs.push(...(await loader.load()))
                }
            }
        }

        if (metadata) {
            let parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            parsedMetadata = removeValuesStartingWithSlash(parsedMetadata)
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

const removeValuesStartingWithSlash = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {}

    for (const key in obj) {
        const value = obj[key]
        if (typeof value === 'string' && value.startsWith('/')) {
            continue
        }
        result[key] = value
    }

    return result
}

class TextLoader extends BaseDocumentLoader {
    constructor(public filePathOrBlob: string | Blob) {
        super()
    }

    protected async parse(raw: string): Promise<{ pageContent: string; metadata: ICommonObject }[]> {
        return [{ pageContent: raw, metadata: {} }]
    }

    public async load(): Promise<Document[]> {
        let text: string
        let metadata: Record<string, string>
        if (typeof this.filePathOrBlob === 'string') {
            const { readFile } = await TextLoader.imports()
            text = await readFile(this.filePathOrBlob, 'utf8')
            metadata = { source: this.filePathOrBlob }
        } else {
            text = await this.filePathOrBlob.text()
            metadata = { source: 'blob', blobType: this.filePathOrBlob.type }
        }
        const parsed = await this.parse(text)
        parsed.forEach((parsedData, i) => {
            const { pageContent } = parsedData
            if (typeof pageContent !== 'string') {
                throw new Error(`Expected string, at position ${i} got ${typeof pageContent}`)
            }
        })
        return parsed.map((parsedData, i) => {
            const { pageContent, metadata: additionalMetadata } = parsedData
            return new Document({
                pageContent,
                metadata:
                    parsed.length === 1
                        ? { ...metadata, ...additionalMetadata }
                        : {
                              ...metadata,
                              line: i + 1,
                              ...additionalMetadata
                          }
            })
        })
    }

    static async imports(): Promise<{
        readFile: typeof ReadFileT
    }> {
        try {
            const { readFile } = await import('node:fs/promises')
            return { readFile }
        } catch (e) {
            console.error(e)
            throw new Error(`Failed to load fs/promises. Make sure you are running in Node.js environment.`)
        }
    }
}

class JSONLoader extends TextLoader {
    public pointers: string[]
    private metadataMapping: Record<string, string>

    constructor(filePathOrBlob: string | Blob, pointers: string | string[] = [], metadataMapping: Record<string, string> = {}) {
        super(filePathOrBlob)
        this.pointers = Array.isArray(pointers) ? pointers : [pointers]
        if (metadataMapping) {
            this.metadataMapping = typeof metadataMapping === 'object' ? metadataMapping : JSON.parse(metadataMapping)
        }
    }

    protected async parse(raw: string): Promise<Document[]> {
        const json = JSON.parse(raw.trim())
        const documents: Document[] = []

        // Handle both single object and array of objects
        const jsonArray = Array.isArray(json) ? json : [json]

        for (const item of jsonArray) {
            const content = this.extractContent(item)
            const metadata = this.extractMetadata(item)

            for (const pageContent of content) {
                documents.push({
                    pageContent,
                    metadata
                })
            }
        }

        return documents
    }

    /**
     * Extracts content based on specified pointers or all strings if no pointers
     */
    private extractContent(json: any): string[] {
        const compiledPointers = this.pointers.map((pointer) => jsonpointer.compile(pointer))

        return this.extractArrayStringsFromObject(json, compiledPointers, !(this.pointers.length > 0))
    }

    /**
     * Extracts metadata based on the mapping configuration
     */
    private extractMetadata(json: any): Record<string, any> {
        let metadata: Record<string, any> = {}

        if (this.metadataMapping) {
            const values = Object.values(this.metadataMapping).filter((value) => typeof value === 'string' && value.startsWith('/'))
            for (const value of values) {
                if (value) {
                    const key = Object.keys(this.metadataMapping).find((key) => this.metadataMapping?.[key] === value)
                    if (key) {
                        metadata = {
                            ...metadata,
                            [key]: jsonpointer.get(json, value)
                        }
                    }
                }
            }
        }

        return metadata
    }

    /**
     * If JSON pointers are specified, return all strings below any of them
     * and exclude all other nodes expect if they match a JSON pointer.
     * If no JSON pointer is specified then return all string in the object.
     */
    private extractArrayStringsFromObject(
        json: any,
        pointers: jsonpointer[],
        extractAllStrings = false,
        keyHasBeenFound = false
    ): string[] {
        if (!json) {
            return []
        }

        if (typeof json === 'string' && extractAllStrings) {
            return [json]
        }

        if (Array.isArray(json) && extractAllStrings) {
            let extractedString: string[] = []
            for (const element of json) {
                extractedString = extractedString.concat(this.extractArrayStringsFromObject(element, pointers, true))
            }
            return extractedString
        }

        if (typeof json === 'object') {
            if (extractAllStrings) {
                return this.extractArrayStringsFromObject(Object.values(json), pointers, true)
            }

            const targetedEntries = this.getTargetedEntries(json, pointers)
            const thisLevelEntries = Object.values(json) as object[]
            const notTargetedEntries = thisLevelEntries.filter((entry: object) => !targetedEntries.includes(entry))

            let extractedStrings: string[] = []
            if (targetedEntries.length > 0) {
                for (const oneEntry of targetedEntries) {
                    extractedStrings = extractedStrings.concat(this.extractArrayStringsFromObject(oneEntry, pointers, true, true))
                }

                for (const oneEntry of notTargetedEntries) {
                    extractedStrings = extractedStrings.concat(this.extractArrayStringsFromObject(oneEntry, pointers, false, true))
                }
            } else if (extractAllStrings || !keyHasBeenFound) {
                for (const oneEntry of notTargetedEntries) {
                    extractedStrings = extractedStrings.concat(this.extractArrayStringsFromObject(oneEntry, pointers, extractAllStrings))
                }
            }

            return extractedStrings
        }

        return []
    }

    private getTargetedEntries(json: object, pointers: jsonpointer[]): object[] {
        const targetEntries = []
        for (const pointer of pointers) {
            const targetedEntry = pointer.get(json)
            if (targetedEntry) {
                targetEntries.push(targetedEntry)
            }
        }
        return targetEntries
    }
}

module.exports = { nodeClass: Json_DocumentLoaders }
