import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { JiraProjectLoaderParams, JiraProjectLoader } from '@langchain/community/document_loaders/web/jira'
import { getCredentialData, getCredentialParam, handleEscapeCharacters, INodeOutputsValue } from '../../../src'

class Jira_DocumentLoaders implements INode {
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
        this.label = 'Jira'
        this.name = 'jira'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'jira.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка задач из Jira`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            description: 'Учетные данные API Jira',
            credentialNames: ['jiraApi']
        }
        this.inputs = [
            {
                label: 'Хост',
                name: 'host',
                type: 'string',
                placeholder: 'https://jira.example.com'
            },
            {
                label: 'Ключ проекта',
                name: 'projectKey',
                type: 'string',
                default: 'main'
            },
            {
                label: 'Лимит на запрос',
                name: 'limitPerRequest',
                type: 'number',
                step: 1,
                optional: true,
                placeholder: '100'
            },
            {
                label: 'Создано после',
                name: 'createdAfter',
                type: 'string',
                optional: true,
                placeholder: '2024-01-01'
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
        const host = nodeData.inputs?.host as string
        const projectKey = nodeData.inputs?.projectKey as string
        const limitPerRequest = nodeData.inputs?.limitPerRequest as string
        const createdAfter = nodeData.inputs?.createdAfter as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const username = getCredentialParam('username', credentialData, nodeData)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const jiraOptions: JiraProjectLoaderParams = {
            projectKey,
            host,
            username,
            accessToken
        }

        if (limitPerRequest) {
            jiraOptions.limitPerRequest = parseInt(limitPerRequest)
        }

        if (createdAfter) {
            jiraOptions.createdAfter = new Date(createdAfter)
        }

        const loader = new JiraProjectLoader(jiraOptions)
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

module.exports = { nodeClass: Jira_DocumentLoaders }
