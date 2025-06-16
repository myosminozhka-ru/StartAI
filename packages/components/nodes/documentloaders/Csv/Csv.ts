import { TextSplitter } from 'langchain/text_splitter'
import { CSVLoader } from './CsvLoader'
import { getFileFromStorage, handleDocumentLoaderDocuments, handleDocumentLoaderMetadata, handleDocumentLoaderOutput } from '../../../src'
import { ICommonObject, IDocument, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class Csv_DocumentLoaders implements INode {
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
        this.label = 'CSV файл'
        this.name = 'csvFile'
        this.version = 3.0
        this.type = 'Document'
        this.icon = 'csv.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из CSV файлов`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'CSV файл',
                name: 'csvFile',
                type: 'file',
                fileType: '.csv'
            },
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Извлечение одного столбца',
                name: 'columnName',
                type: 'string',
                description: 'Извлечение данных из одного столбца',
                placeholder: 'Введите название столбца',
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

    getFiles(nodeData: INodeData) {
        const csvFileBase64 = nodeData.inputs?.csvFile as string

        let files: string[] = []
        let fromStorage: boolean = true

        if (csvFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = csvFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
        } else {
            if (csvFileBase64.startsWith('[') && csvFileBase64.endsWith(']')) {
                files = JSON.parse(csvFileBase64)
            } else {
                files = [csvFileBase64]
            }

            fromStorage = false
        }

        return { files, fromStorage }
    }

    async getFileData(file: string, { orgId, chatflowid }: { orgId: string; chatflowid: string }, fromStorage?: boolean) {
        if (fromStorage) {
            return getFileFromStorage(file, orgId, chatflowid)
        } else {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            return Buffer.from(splitDataURI.pop() || '', 'base64')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const columnName = nodeData.inputs?.columnName as string
        const metadata = nodeData.inputs?.metadata
        const output = nodeData.outputs?.output as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let docs: IDocument[] = []

        const orgId = options.orgId
        const chatflowid = options.chatflowid

        const { files, fromStorage } = this.getFiles(nodeData)

        for (const file of files) {
            if (!file) continue

            const fileData = await this.getFileData(file, { orgId, chatflowid }, fromStorage)
            const blob = new Blob([fileData])
            const loader = new CSVLoader(blob, columnName.trim().length === 0 ? undefined : columnName.trim())

            // use spread instead of push, because it raises RangeError: Maximum call stack size exceeded when too many docs
            docs = [...docs, ...(await handleDocumentLoaderDocuments(loader, textSplitter))]
        }

        docs = handleDocumentLoaderMetadata(docs, _omitMetadataKeys, metadata)

        return handleDocumentLoaderOutput(docs, output)
    }
}

module.exports = { nodeClass: Csv_DocumentLoaders }
