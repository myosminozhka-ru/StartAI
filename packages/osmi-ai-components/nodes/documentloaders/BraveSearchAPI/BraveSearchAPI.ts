import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { BraveSearch } from '@langchain/community/tools/brave_search'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { Document } from '@langchain/core/documents'

class BraveSearchAPI_DocumentLoaders implements INode {
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
        this.label = 'BraveSearch API Загрузчик документов'
        this.name = 'braveSearchApiLoader'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'brave.svg'
        this.category = 'Document Loaders'
        this.description = 'Загрузка и обработка данных из результатов BraveSearch'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            optional: false,
            credentialNames: ['braveSearchApi']
        }
        this.inputs = [
            {
                label: 'Запрос',
                name: 'query',
                type: 'string'
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
        const query = nodeData.inputs?.query as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const braveApiKey = getCredentialParam('braveApiKey', credentialData, nodeData)
        const loader = new BraveSearch({ apiKey: braveApiKey })

        let docs: IDocument[] = []
        const searchResults = await loader._call(query) // Use _call method for search
        const parsedResults = JSON.parse(searchResults) // Parse the JSON string to get documents

        // Format the results to match the expected Document structure
        docs = parsedResults.map(
            (result: any) =>
                new Document({
                    pageContent: result.snippet, // Assuming snippet is the content
                    metadata: {
                        title: result.title,
                        link: result.link
                    }
                })
        )

        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
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

module.exports = { nodeClass: BraveSearchAPI_DocumentLoaders }
