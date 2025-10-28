import { omit } from 'lodash'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src'
import { ICommonObject, IDocument, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'
import { FigmaFileLoader, FigmaLoaderParams } from '@langchain/community/document_loaders/web/figma'
import { TextSplitter } from 'langchain/text_splitter'

class Figma_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Figma'
        this.name = 'figma'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'figma.svg'
        this.category = 'Document Loaders'
        this.description = 'Загрузка данных из файла Figma'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['figmaApi']
        }
        this.inputs = [
            {
                label: 'Ключ файла',
                name: 'fileKey',
                type: 'string',
                placeholder: 'key',
                description:
                    'Ключ файла можно найти в URL любого файла Figma: https://www.figma.com/file/:key/:title. Например, в https://www.figma.com/file/12345/Website ключ файла - это 12345'
            },
            {
                label: 'ID узлов',
                name: 'nodeIds',
                type: 'string',
                placeholder: '0, 1, 2',
                description:
                    'Список ID узлов, разделенных запятыми. См. <a target="_blank" href="https://www.figma.com/community/plugin/758276196886757462/Node-Inspector">официальное руководство</a> о том, как получить ID узлов'
            },
            {
                label: 'Рекурсивно',
                name: 'recursive',
                type: 'boolean',
                optional: true
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
        const nodeIds = (nodeData.inputs?.nodeIds as string)?.trim().split(',') || []
        const fileKey = nodeData.inputs?.fileKey as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const figmaOptions: FigmaLoaderParams = {
            accessToken,
            nodeIds,
            fileKey
        }

        const loader = new FigmaFileLoader(figmaOptions)

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

module.exports = { nodeClass: Figma_DocumentLoaders }
