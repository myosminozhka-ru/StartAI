import { omit } from 'lodash'
import { TextSplitter } from 'langchain/text_splitter'
import { ConfluencePagesLoader, ConfluencePagesLoaderParams } from '@langchain/community/document_loaders/web/confluence'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'

class Confluence_DocumentLoaders implements INode {
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
        this.label = 'Confluence'
        this.name = 'confluence'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'confluence.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из документа Confluence`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['confluenceCloudApi', 'confluenceServerDCApi']
        }
        this.inputs = [
            {
                label: 'Разделитель текста',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Базовый URL',
                name: 'baseUrl',
                type: 'string',
                placeholder: 'https://example.atlassian.net/wiki'
            },
            {
                label: 'Ключ пространства',
                name: 'spaceKey',
                type: 'string',
                placeholder: '~EXAMPLE362906de5d343d49dcdbae5dEXAMPLE',
                description:
                    'См. <a target="_blank" href="https://community.atlassian.com/t5/Confluence-questions/How-to-find-the-key-for-a-space/qaq-p/864760">официальное руководство</a> о том, как получить ключ пространства Confluence'
            },
            {
                label: 'Лимит',
                name: 'limit',
                type: 'number',
                default: 0,
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
        const spaceKey = nodeData.inputs?.spaceKey as string
        const baseUrl = nodeData.inputs?.baseUrl as string
        const limit = nodeData.inputs?.limit as number
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
        const personalAccessToken = getCredentialParam('personalAccessToken', credentialData, nodeData)
        const username = getCredentialParam('username', credentialData, nodeData)

        let confluenceOptions: ConfluencePagesLoaderParams = {
            baseUrl,
            spaceKey,
            limit
        }

        if (accessToken) {
            // Confluence Cloud credentials
            confluenceOptions.username = username
            confluenceOptions.accessToken = accessToken
        } else if (personalAccessToken) {
            // Confluence Server/Data Center credentials
            confluenceOptions.personalAccessToken = personalAccessToken
        }

        const loader = new ConfluencePagesLoader(confluenceOptions)

        let docs = []

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

module.exports = { nodeClass: Confluence_DocumentLoaders }
