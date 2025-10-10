import { omit } from 'lodash'
import { IDocument, ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { getFileFromStorage, handleEscapeCharacters, INodeOutputsValue } from '../../../src'

class Pdf_DocumentLoaders implements INode {
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
        this.label = 'PDF файл'
        this.name = 'pdfFile'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'pdf.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из PDF файлов`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'PDF файл',
                name: 'pdfFile',
                type: 'file',
                fileType: '.pdf'
            },
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Использование',
                name: 'usage',
                type: 'options',
                options: [
                    {
                        label: 'Один документ на страницу',
                        name: 'perPage'
                    },
                    {
                        label: 'Один документ на файл',
                        name: 'perFile'
                    }
                ],
                default: 'perPage'
            },
            {
                label: 'Использовать устаревшую сборку',
                name: 'legacyBuild',
                type: 'boolean',
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
        const pdfFileBase64 = nodeData.inputs?.pdfFile as string
        const usage = nodeData.inputs?.usage as string
        const metadata = nodeData.inputs?.metadata
        const legacyBuild = nodeData.inputs?.legacyBuild as boolean
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let docs: IDocument[] = []
        let files: string[] = []

        //FILE-STORAGE::["CONTRIBUTING.md","LICENSE.md","README.md"]
        if (pdfFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = pdfFileBase64.replace('FILE-STORAGE::', '')
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
                const bf = Buffer.from(fileData)
                await this.extractDocs(usage, bf, legacyBuild, textSplitter, docs)
            }
        } else {
            if (pdfFileBase64.startsWith('[') && pdfFileBase64.endsWith(']')) {
                files = JSON.parse(pdfFileBase64)
            } else {
                files = [pdfFileBase64]
            }

            for (const file of files) {
                if (!file) continue
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                await this.extractDocs(usage, bf, legacyBuild, textSplitter, docs)
            }
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

    private async extractDocs(usage: string, bf: Buffer, legacyBuild: boolean, textSplitter: TextSplitter, docs: IDocument[]) {
        if (usage === 'perFile') {
            const loader = new PDFLoader(new Blob([bf]), {
                splitPages: false,
                pdfjs: () =>
                    // @ts-ignore
                    legacyBuild ? import('pdfjs-dist/legacy/build/pdf.js') : import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
            })
            if (textSplitter) {
                let splittedDocs = await loader.load()
                splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                docs.push(...splittedDocs)
            } else {
                docs.push(...(await loader.load()))
            }
        } else {
            const loader = new PDFLoader(new Blob([bf]), {
                pdfjs: () =>
                    // @ts-ignore
                    legacyBuild ? import('pdfjs-dist/legacy/build/pdf.js') : import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
            })
            if (textSplitter) {
                let splittedDocs = await loader.load()
                splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                docs.push(...splittedDocs)
            } else {
                docs.push(...(await loader.load()))
            }
        }
    }
}

module.exports = { nodeClass: Pdf_DocumentLoaders }
