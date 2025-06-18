import { flatten } from 'lodash'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { addMMRInputParams, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'
import { MongoDBAtlasVectorSearch } from './core'

// TODO: Add ability to specify env variable and use singleton pattern (i.e initialize MongoDB on server and pass to component)
class MongoDBAtlas_VectorStores implements INode {
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
        this.label = 'MongoDB Atlas'
        this.name = 'mongoDBAtlas'
        this.version = 1.0
        this.description = `Вставить встроенные данные и выполнить поиск по сходству или mmr по запросу, используя MongoDB Atlas, управляемую облачную mongodb базу данных`
        this.type = 'MongoDB Atlas'
        this.icon = 'mongodb.svg'
        this.category = 'Vector Stores'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mongoDBUrlApi']
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
                label: 'Вложения',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'База данных',
                name: 'databaseName',
                placeholder: '<DB_NAME>',
                type: 'string'
            },
            {
                label: 'Имя коллекции',
                name: 'collectionName',
                placeholder: '<COLLECTION_NAME>',
                type: 'string'
            },
            {
                label: 'Имя индекса',
                name: 'indexName',
                placeholder: '<VECTOR_INDEX_NAME>',
                type: 'string'
            },
            {
                label: 'Поле контента',
                name: 'textKey',
                description: 'Имя поля (столбца), которое содержит фактический контент',
                type: 'string',
                default: 'text',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Поле вложения',
                name: 'embeddingKey',
                description: 'Имя поля (столбца), которое содержит вложение',
                type: 'string',
                default: 'embedding',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Mongodb Metadata Filter',
                name: 'mongoMetadataFilter',
                type: 'json',
                optional: true,
                additionalParams: true
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
                label: 'MongoDB Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'MongoDB Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(MongoDBAtlasVectorSearch)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const databaseName = nodeData.inputs?.databaseName as string
            const collectionName = nodeData.inputs?.collectionName as string
            const indexName = nodeData.inputs?.indexName as string
            let textKey = nodeData.inputs?.textKey as string
            let embeddingKey = nodeData.inputs?.embeddingKey as string
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            let mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)

            const docs = nodeData.inputs?.document as Document[]

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const document = new Document(flattenDocs[i])
                    finalDocs.push(document)
                }
            }

            try {
                if (!textKey || textKey === '') textKey = 'text'
                if (!embeddingKey || embeddingKey === '') embeddingKey = 'embedding'

                const mongoDBAtlasVectorSearch = new MongoDBAtlasVectorSearch(embeddings, {
                    connectionDetails: { mongoDBConnectUrl, databaseName, collectionName },
                    indexName,
                    textKey,
                    embeddingKey
                })
                await mongoDBAtlasVectorSearch.addDocuments(finalDocs)

                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const databaseName = nodeData.inputs?.databaseName as string
        const collectionName = nodeData.inputs?.collectionName as string
        const indexName = nodeData.inputs?.indexName as string
        let textKey = nodeData.inputs?.textKey as string
        let embeddingKey = nodeData.inputs?.embeddingKey as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const mongoMetadataFilter = nodeData.inputs?.mongoMetadataFilter as object

        let mongoDBConnectUrl = getCredentialParam('mongoDBConnectUrl', credentialData, nodeData)

        const mongoDbFilter: MongoDBAtlasVectorSearch['FilterType'] = {}

        try {
            if (!textKey || textKey === '') textKey = 'text'
            if (!embeddingKey || embeddingKey === '') embeddingKey = 'embedding'

            const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
                connectionDetails: { mongoDBConnectUrl, databaseName, collectionName },
                indexName,
                textKey,
                embeddingKey
            })

            if (mongoMetadataFilter) {
                const metadataFilter = typeof mongoMetadataFilter === 'object' ? mongoMetadataFilter : JSON.parse(mongoMetadataFilter)

                for (const key in metadataFilter) {
                    mongoDbFilter.preFilter = {
                        ...mongoDbFilter.preFilter,
                        [key]: {
                            $eq: metadataFilter[key]
                        }
                    }
                }
            }

            return resolveVectorStoreOrRetriever(nodeData, vectorStore, mongoDbFilter)
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: MongoDBAtlas_VectorStores }
