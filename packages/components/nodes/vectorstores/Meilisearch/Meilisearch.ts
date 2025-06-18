import { getCredentialData, getCredentialParam } from '../../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Meilisearch } from 'meilisearch'
import { MeilisearchRetriever } from './core'
import { flatten } from 'lodash'
import { Document } from '@langchain/core/documents'
import { v4 as uuidv4 } from 'uuid'
import { Embeddings } from '@langchain/core/embeddings'

class MeilisearchRetriever_node implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]
    author?: string

    constructor() {
        this.label = 'Meilisearch'
        this.name = 'meilisearch'
        this.version = 1.0
        this.type = 'Meilisearch'
        this.icon = 'Meilisearch.png'
        this.category = 'Vector Stores'
        this.description = `Вставить встроенные данные и выполнить поиск по сходству по запросу, используя гибридную функциональность поиска Meilisearch`
        this.baseClasses = ['BaseRetriever']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['meilisearchApi']
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
                label: 'Хост',
                name: 'host',
                type: 'string',
                description: "Это URL для желаемого экземпляра Meilisearch, URL не должен заканчиваться на '/'"
            },
            {
                label: 'UID индекса',
                name: 'indexUid',
                type: 'string',
                description: 'UID для индекса, из которого отвечать'
            },
            {
                label: 'Удалить индекс если существует',
                name: 'deleteIndex',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Топ K',
                name: 'K',
                type: 'number',
                description: 'количество лучших поисков для возврата в качестве контекста, по умолчанию 4',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Семантическое соотношение',
                name: 'semanticRatio',
                type: 'number',
                description: 'процент семантического рассуждения в гибридном поиске meilisearch, по умолчанию 0.75',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Фильтр поиска',
                name: 'searchFilter',
                type: 'string',
                description: 'фильтр поиска для применения к поисковым атрибутам',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Meilisearch Retriever',
                name: 'MeilisearchRetriever',
                description: 'извлекать ответы',
                baseClasses: this.baseClasses
            }
        ]
        this.outputs = [
            {
                label: 'Meilisearch Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            }
        ]
    }
    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<any> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const meilisearchAdminApiKey = getCredentialParam('meilisearchAdminApiKey', credentialData, nodeData)
            const docs = nodeData.inputs?.document as Document[]
            const host = nodeData.inputs?.host as string
            const indexUid = nodeData.inputs?.indexUid as string
            const deleteIndex = nodeData.inputs?.deleteIndex as boolean
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            let embeddingDimension: number = 384
            const client = new Meilisearch({
                host: host,
                apiKey: meilisearchAdminApiKey
            })
            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const uniqueId = uuidv4()
                    const { pageContent, metadata } = flattenDocs[i]
                    const docEmbedding = await embeddings.embedQuery(pageContent)
                    embeddingDimension = docEmbedding.length
                    const documentForIndexing = {
                        pageContent,
                        metadata,
                        objectID: uniqueId,
                        _vectors: {
                            ollama: {
                                embeddings: docEmbedding,
                                regenerate: false
                            }
                        }
                    }
                    finalDocs.push(documentForIndexing)
                }
            }
            let taskUid_created: number = 0

            if (deleteIndex) {
                try {
                    const deleteResponse = await client.deleteIndex(indexUid)
                    taskUid_created = deleteResponse.taskUid
                    let deleteTaskStatus = await client.getTask(taskUid_created)

                    while (deleteTaskStatus.status !== 'succeeded') {
                        deleteTaskStatus = await client.getTask(taskUid_created)
                        if (deleteTaskStatus.error !== null || deleteTaskStatus.status === 'failed') {
                            throw new Error('Error during index deletion task: ' + deleteTaskStatus.error)
                        }
                    }
                } catch (error) {
                    console.error(error)
                    console.warn('Error occured when deleting your index, if it did not exist, we will create one for you... ')
                }
            }

            let index: any

            try {
                index = await client.getIndex(indexUid)
            } catch (error) {
                console.warn('Index not found, creating a new index...')

                try {
                    const createResponse = await client.createIndex(indexUid, { primaryKey: 'objectID' })
                    taskUid_created = createResponse.taskUid
                    let createTaskStatus = await client.getTask(taskUid_created)

                    while (createTaskStatus.status !== 'succeeded') {
                        createTaskStatus = await client.getTask(taskUid_created)
                        if (createTaskStatus.error !== null || createTaskStatus.status === 'failed') {
                            throw new Error('Error during index creation task: ' + createTaskStatus.error)
                        }
                    }
                    index = await client.getIndex(indexUid)
                } catch (taskError) {
                    console.error('Error during index creation process:', taskError)
                }
            }

            try {
                await index.updateFilterableAttributes(['metadata'])
                await index.updateSettings({
                    embedders: {
                        ollama: {
                            source: 'userProvided',
                            dimensions: embeddingDimension
                        }
                    }
                })
                const addResponse = await index.addDocuments(finalDocs)
                taskUid_created = addResponse.taskUid
                let AddTaskStatus = await client.getTask(taskUid_created)
                while (AddTaskStatus.status !== 'succeeded') {
                    AddTaskStatus = await client.getTask(taskUid_created)
                    if (AddTaskStatus.error !== null || AddTaskStatus.status === 'failed') {
                        throw new Error('Error during documents adding task: ' + AddTaskStatus.error)
                    }
                }
                index = await client.getIndex(indexUid)
            } catch (error) {
                console.error('Error occurred while adding documents:', error)
            }
            return { numAdded: finalDocs.length, addedDocs: finalDocs }
        }
    }
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const meilisearchSearchApiKey = getCredentialParam('meilisearchSearchApiKey', credentialData, nodeData)
        const meilisearchAdminApiKey = getCredentialParam('meilisearchAdminApiKey', credentialData, nodeData)
        const host = nodeData.inputs?.host as string
        const indexUid = nodeData.inputs?.indexUid as string
        const K = nodeData.inputs?.K as string
        const semanticRatio = nodeData.inputs?.semanticRatio as string
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const searchFilter = nodeData.inputs?.searchFilter as string

        const experimentalEndpoint = host + '/experimental-features/'
        const token = meilisearchAdminApiKey

        const experimentalOptions = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                vectorStore: true
            })
        }

        try {
            const response = await fetch(experimentalEndpoint, experimentalOptions)
            if (!response.ok) {
                throw new Error(`Failed to enable vectorStore: ${response.statusText}`)
            }

            const data = await response.json()

            const vectorStoreEnabled = data.vectorStore
            if (vectorStoreEnabled !== true) {
                throw new Error('Failed to enable vectorStore, vectorStrore property returned is not true')
            }
        } catch (error) {
            console.error('Error enabling vectorStore feature:', error)
        }

        const hybridsearchretriever = new MeilisearchRetriever(
            host,
            meilisearchSearchApiKey,
            indexUid,
            K,
            semanticRatio,
            embeddings,
            searchFilter
        )
        return hybridsearchretriever
    }
}
module.exports = { nodeClass: MeilisearchRetriever_node }
