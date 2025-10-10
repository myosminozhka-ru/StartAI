import { flatten } from 'lodash'
import { IndexingResult, INode, INodeOutputsValue, INodeParams, INodeData, ICommonObject } from '../../../src/Interface'
import { FLOWISE_CHATID, getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { UpstashVectorStore } from '@langchain/community/vectorstores/upstash'
import { Index as UpstashIndex } from '@upstash/vector'
import { index } from '../../../src/indexing'
import { howToUseFileUpload, resolveVectorStoreOrRetriever } from '../VectorStoreUtils'

type UpstashVectorStoreParams = {
    index: UpstashIndex
    filter?: string
}
class Upstash_VectorStores implements INode {
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
        this.label = 'Upstash Vector'
        this.name = 'upstash'
        this.version = 2.0
        this.type = 'Upstash'
        this.icon = 'upstash.svg'
        this.category = 'Vector Stores'
        this.description =
            'Загружайте данные как встраивания или строки и выполняйте поиск по сходству с Upstash, ведущей серверной платформой данных'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            description: 'Необходимые учетные данные для HTTP-соединения',
            credentialNames: ['upstashVectorApi']
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
                label: 'Встраивания',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Менеджер записей',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Отслеживайте запись для предотвращения дублирования',
                optional: true
            },
            {
                label: 'Загрузка файлов',
                name: 'fileUpload',
                description: 'Разрешить загрузку файлов в чате',
                hint: {
                    label: 'Как использовать',
                    value: howToUseFileUpload
                },
                type: 'boolean',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Upstash Фильтр метаданных',
                name: 'upstashMetadataFilter',
                type: 'string',
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
        this.outputs = [
            {
                label: 'Upstash Извлекатель',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Upstash Векторное хранилище',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(UpstashVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager
            const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const UPSTASH_VECTOR_REST_URL = getCredentialParam('UPSTASH_VECTOR_REST_URL', credentialData, nodeData)
            const UPSTASH_VECTOR_REST_TOKEN = getCredentialParam('UPSTASH_VECTOR_REST_TOKEN', credentialData, nodeData)

            const upstashIndex = new UpstashIndex({
                url: UPSTASH_VECTOR_REST_URL,
                token: UPSTASH_VECTOR_REST_TOKEN
            })

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    if (isFileUploadEnabled && options.chatId) {
                        flattenDocs[i].metadata = { ...flattenDocs[i].metadata, [FLOWISE_CHATID]: options.chatId }
                    }
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const obj = {
                index: upstashIndex
            }

            try {
                if (recordManager) {
                    const vectorStore = await UpstashVectorStore.fromExistingIndex(embeddings, obj)
                    await recordManager.createSchema()
                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: UPSTASH_VECTOR_REST_URL
                        }
                    })

                    return res
                } else {
                    await UpstashVectorStore.fromDocuments(finalDocs, embeddings, obj)
                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const UPSTASH_VECTOR_REST_URL = getCredentialParam('UPSTASH_VECTOR_REST_URL', credentialData, nodeData)
            const UPSTASH_VECTOR_REST_TOKEN = getCredentialParam('UPSTASH_VECTOR_REST_TOKEN', credentialData, nodeData)

            const upstashIndex = new UpstashIndex({
                url: UPSTASH_VECTOR_REST_URL,
                token: UPSTASH_VECTOR_REST_TOKEN
            })

            const obj = {
                index: upstashIndex
            }

            const upstashStore = new UpstashVectorStore(embeddings, obj)

            try {
                if (recordManager) {
                    const vectorStoreName = UPSTASH_VECTOR_REST_URL
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const keys: string[] = await recordManager.listKeys({})

                    await upstashStore.delete({ ids: keys })
                    await recordManager.deleteKeys(keys)
                } else {
                    await upstashStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const upstashMetadataFilter = nodeData.inputs?.upstashMetadataFilter
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const isFileUploadEnabled = nodeData.inputs?.fileUpload as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const UPSTASH_VECTOR_REST_URL = getCredentialParam('UPSTASH_VECTOR_REST_URL', credentialData, nodeData)
        const UPSTASH_VECTOR_REST_TOKEN = getCredentialParam('UPSTASH_VECTOR_REST_TOKEN', credentialData, nodeData)

        const upstashIndex = new UpstashIndex({
            url: UPSTASH_VECTOR_REST_URL,
            token: UPSTASH_VECTOR_REST_TOKEN
        })

        const obj: UpstashVectorStoreParams = {
            index: upstashIndex
        }

        if (upstashMetadataFilter) {
            obj.filter = upstashMetadataFilter
        }
        if (isFileUploadEnabled && options.chatId) {
            if (upstashMetadataFilter) obj.filter += ` OR ${FLOWISE_CHATID} = "${options.chatId}" OR HAS NOT FIELD ${FLOWISE_CHATID}`
            else obj.filter = `${FLOWISE_CHATID} = "${options.chatId}" OR HAS NOT FIELD ${FLOWISE_CHATID}`
        }

        const vectorStore = await UpstashVectorStore.fromExistingIndex(embeddings, obj)

        return resolveVectorStoreOrRetriever(nodeData, vectorStore, obj.filter)
    }
}

module.exports = { nodeClass: Upstash_VectorStores }
