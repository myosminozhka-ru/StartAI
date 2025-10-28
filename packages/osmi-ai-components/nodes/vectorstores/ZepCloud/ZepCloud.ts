import { flatten } from 'lodash'
import { ZepClient } from '@getzep/zep-cloud'
import { IZepConfig, ZepVectorStore } from '@getzep/zep-cloud/langchain'
import { Document } from 'langchain/document'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { FakeEmbeddings } from 'langchain/embeddings/fake'
import { Embeddings } from '@langchain/core/embeddings'

class Zep_CloudVectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Zep Collection - Cloud'
        this.name = 'zepCloud'
        this.version = 2.0
        this.type = 'Zep'
        this.icon = 'zep.svg'
        this.category = 'Vector Stores'
        this.description =
            'Загружайте встроенные данные и выполняйте поиск по сходству или mmr при запросе с помощью Zep, быстрого и масштабируемого строительного блока для LLM-приложений'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            optional: false,
            description: 'Настройте JWT-аутентификацию на вашем экземпляре Zep (необязательно)',
            credentialNames: ['zepMemoryApi']
        }
        this.inputs = [
            {
                label: 'Документ',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Zep Коллекция',
                name: 'zepCollection',
                type: 'string',
                placeholder: 'my-first-collection'
            },
            {
                label: 'Zep Фильтр метаданных',
                name: 'zepMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true,
                acceptVariable: true
            },
            {
                label: 'Топ K',
                name: 'topK',
                description: 'Количество лучших результатов для получения. По умолчанию 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        addMMRInputParams(this.inputs)
        this.outputs = [
            {
                label: 'Zep Извлекатель',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Zep Векторное хранилище',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(ZepVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const zepCollection = nodeData.inputs?.zepCollection as string
            const docs = nodeData.inputs?.document as Document[]
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }
            const client = new ZepClient({
                apiKey: apiKey
            })
            const zepConfig = {
                apiKey: apiKey,
                collectionName: zepCollection,
                client
            }
            try {
                await ZepVectorStore.fromDocuments(finalDocs, new FakeEmbeddings(), zepConfig)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const zepCollection = nodeData.inputs?.zepCollection as string
        const zepMetadataFilter = nodeData.inputs?.zepMetadataFilter
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)

        const zepConfig: IZepConfig & Partial<ZepFilter> = {
            apiKey,
            collectionName: zepCollection
        }
        if (zepMetadataFilter) {
            zepConfig.filter = typeof zepMetadataFilter === 'object' ? zepMetadataFilter : JSON.parse(zepMetadataFilter)
        }
        zepConfig.client = new ZepClient({
            apiKey: apiKey
        })
        const vectorStore = await ZepExistingVS.init(zepConfig)
        return resolveVectorStoreOrRetriever(nodeData, vectorStore, zepConfig.filter)
    }
}

interface ZepFilter {
    filter: Record<string, any>
}

class ZepExistingVS extends ZepVectorStore {
    filter?: Record<string, any>
    args?: IZepConfig & Partial<ZepFilter>

    constructor(embeddings: Embeddings, args: IZepConfig & Partial<ZepFilter>) {
        super(embeddings, args)
        this.filter = args.filter
        this.args = args
    }

    static async fromExistingIndex(embeddings: Embeddings, dbConfig: IZepConfig & Partial<ZepFilter>): Promise<ZepVectorStore> {
        return new this(embeddings, dbConfig)
    }
}

module.exports = { nodeClass: Zep_CloudVectorStores }
