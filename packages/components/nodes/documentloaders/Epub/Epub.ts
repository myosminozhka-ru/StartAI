import { omit } from 'lodash'
import { IDocument, ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { getFileFromStorage, handleEscapeCharacters, INodeOutputsValue } from '../../../src'
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub'

import * as fs from 'fs'
import * as path from 'path'
class Epub_DocumentLoaders implements INode {
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
        this.label = 'EPUB файл'
        this.name = 'epubFile'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'epub.svg'
        this.category = 'Document Loaders'
        this.description = 'Загрузка данных из EPUB файлов'
        this.baseClasses = [this.type]

        this.inputs = [
            {
                label: 'EPUB файл',
                name: 'epubFile',
                type: 'file',
                fileType: '.epub'
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
                        label: 'Один документ на главу',
                        name: 'perChapter'
                    },
                    {
                        label: 'Один документ на файл',
                        name: 'perFile'
                    }
                ],
                default: 'perChapter'
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
                description: 'Ключи метаданных для исключения, разделенные запятыми',
                placeholder: 'key1, key2, key3',
                optional: true,
                additionalParams: true
            }
        ]

        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документов',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Текст',
                name: 'text',
                description: 'Объединенный текст из документов',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const epubFileBase64 = nodeData.inputs?.epubFile as string
        const usage = nodeData.inputs?.usage as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let docs: IDocument[] = []
        let files: string[] = []

        const tempDir = path.join(process.cwd(), 'temp_epub_files')
        fs.mkdirSync(tempDir, { recursive: true })

        try {
            if (epubFileBase64.startsWith('FILE-STORAGE::')) {
                const fileName = epubFileBase64.replace('FILE-STORAGE::', '')
                files = fileName.startsWith('[') && fileName.endsWith(']') ? JSON.parse(fileName) : [fileName]

                const chatflowid = options.chatflowid
                const orgId = options.orgId

                for (const file of files) {
                    if (!file) continue
                    const fileData = await getFileFromStorage(file, orgId, chatflowid)
                    const tempFilePath = path.join(tempDir, `${Date.now()}_${file}`)
                    fs.writeFileSync(tempFilePath, fileData)
                    await this.extractDocs(usage, tempFilePath, textSplitter, docs)
                }
            } else {
                files = epubFileBase64.startsWith('[') && epubFileBase64.endsWith(']') ? JSON.parse(epubFileBase64) : [epubFileBase64]

                for (const file of files) {
                    if (!file) continue
                    const splitDataURI = file.split(',')
                    splitDataURI.pop()
                    const fileBuffer = Buffer.from(splitDataURI.pop() || '', 'base64')
                    const tempFilePath = path.join(tempDir, `${Date.now()}_epub_file.epub`)
                    fs.writeFileSync(tempFilePath, fileBuffer)
                    await this.extractDocs(usage, tempFilePath, textSplitter, docs)
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
        } catch (error) {
            console.error('Error processing EPUB files:', error)
            throw error
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true })
        }
    }

    private async extractDocs(usage: string, filePath: string, textSplitter: TextSplitter, docs: IDocument[]) {
        const loader = new EPubLoader(filePath, { splitChapters: usage === 'perChapter' })
        const loadedDocs = await loader.load()

        const processedDocs = textSplitter ? await textSplitter.splitDocuments(loadedDocs) : loadedDocs

        docs.push(...processedDocs)
    }
}

module.exports = { nodeClass: Epub_DocumentLoaders }
