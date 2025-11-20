import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { getFileFromStorage, handleEscapeCharacters } from '../../../src'

class Docx_DocumentLoaders implements INode {
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
        this.label = 'DOCX файл'
        this.name = 'docxFile'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'docx.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из DOCX файлов`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'DOCX файл',
                name: 'docxFile',
                type: 'file',
                fileType: '.docx'
            },
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
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
        const docxFileBase64 = nodeData.inputs?.docxFile as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        let docs: IDocument[] = []
        let files: string[] = []

        if (docxFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = docxFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const orgId = options.orgId
            const chatflowid = options.chatflowid

            for (const file of files) {
                if (!file) continue
                const fileData = await this.getFileData(file, { orgId, chatflowid }, true)
                const blob = new Blob([fileData as BlobPart])
                const loader = new DocxLoader(blob)

                if (textSplitter) {
                    let splittedDocs = await loader.load()
                    splittedDocs = await textSplitter.splitDocuments(splittedDocs)
                    docs.push(...splittedDocs)
                } else {
                    docs.push(...(await loader.load()))
                }
            }
        } else {
            if (docxFileBase64.startsWith('[') && docxFileBase64.endsWith(']')) {
                files = JSON.parse(docxFileBase64)
            } else {
                files = [docxFileBase64]
            }

            for (const file of files) {
                if (!file) continue
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                const loader = new DocxLoader(blob)

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

module.exports = { nodeClass: Docx_DocumentLoaders }
