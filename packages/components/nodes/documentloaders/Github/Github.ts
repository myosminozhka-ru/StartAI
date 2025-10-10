import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { GithubRepoLoader, GithubRepoLoaderParams } from '@langchain/community/document_loaders/web/github'
import { getCredentialData, getCredentialParam, handleEscapeCharacters, INodeOutputsValue } from '../../../src'

class Github_DocumentLoaders implements INode {
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
        this.label = 'Github'
        this.name = 'github'
        this.version = 3.0
        this.type = 'Document'
        this.icon = 'github.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из репозитория GitHub`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            description: 'Требуется только при доступе к приватному репозиторию',
            optional: true,
            credentialNames: ['githubApi']
        }
        this.inputs = [
            {
                label: 'Ссылка на репозиторий',
                name: 'repoLink',
                type: 'string',
                placeholder: 'https://github.com'
            },
            {
                label: 'Ветка',
                name: 'branch',
                type: 'string',
                default: 'main'
            },
            {
                label: 'Рекурсивно',
                name: 'recursive',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Максимальная параллельность',
                name: 'maxConcurrency',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Базовый URL Github',
                name: 'githubBaseUrl',
                type: 'string',
                placeholder: `https://git.example.com`,
                description: 'Пользовательский базовый URL Github (например, для Enterprise)',
                optional: true,
                additionalParams: true
            },
            {
                label: 'API URL Github',
                name: 'githubInstanceApi',
                type: 'string',
                placeholder: `https://api.github.com`,
                description: 'Пользовательский URL API Github (например, для Enterprise)',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Игнорировать пути',
                name: 'ignorePath',
                description: 'Массив путей для игнорирования',
                placeholder: `["*.md"]`,
                type: 'string',
                rows: 4,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Максимальное количество попыток',
                name: 'maxRetries',
                description:
                    'Максимальное количество повторных попыток для одного вызова, с экспоненциальной задержкой между попытками. По умолчанию 2.',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
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
        const repoLink = nodeData.inputs?.repoLink as string
        const branch = nodeData.inputs?.branch as string
        const recursive = nodeData.inputs?.recursive as boolean
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const maxConcurrency = nodeData.inputs?.maxConcurrency as string
        const maxRetries = nodeData.inputs?.maxRetries as string
        const ignorePath = nodeData.inputs?.ignorePath as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string
        const githubInstanceApi = nodeData.inputs?.githubInstanceApi as string
        const githubBaseUrl = nodeData.inputs?.githubBaseUrl as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const githubOptions: GithubRepoLoaderParams = {
            branch,
            recursive,
            unknown: 'warn'
        }

        if (accessToken) githubOptions.accessToken = accessToken
        if (maxConcurrency) githubOptions.maxConcurrency = parseInt(maxConcurrency, 10)
        if (maxRetries) githubOptions.maxRetries = parseInt(maxRetries, 10)
        if (ignorePath) githubOptions.ignorePaths = JSON.parse(ignorePath)
        if (githubInstanceApi) {
            githubOptions.apiUrl = githubInstanceApi.endsWith('/') ? githubInstanceApi.slice(0, -1) : githubInstanceApi
        }
        if (githubBaseUrl) {
            githubOptions.baseUrl = githubBaseUrl.endsWith('/') ? githubBaseUrl.slice(0, -1) : githubBaseUrl
        }

        const loader = new GithubRepoLoader(repoLink, githubOptions)

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

module.exports = { nodeClass: Github_DocumentLoaders }
