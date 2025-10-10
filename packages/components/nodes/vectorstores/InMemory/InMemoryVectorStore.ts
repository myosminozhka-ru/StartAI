import { flatten } from 'lodash'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { Embeddings } from '@langchain/core/embeddings'
import { Document } from '@langchain/core/documents'
import { INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class InMemoryVectorStore_VectorStores implements INode {
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
        this.label = 'В памяти векторное хранилище'
        this.name = 'memoryVectorStore'
        this.version = 1.0
        this.type = 'Memory'
        this.icon = 'memory.svg'
        this.category = 'Vector Stores'
        this.description =
            'Векторное хранилище в памяти, которое хранит вложения и выполняет точный, линейный поиск наиболее похожих вложений.'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
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
                label: 'Топ K',
                name: 'topK',
                description: 'Количество лучших результатов для получения. По умолчанию 4',
                placeholder: '4',
                type: 'number',
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Memory Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Memory Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(MemoryVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData): Promise<Partial<IndexingResult>> {
            const docs = nodeData.inputs?.document as Document[]
            const embeddings = nodeData.inputs?.embeddings as Embeddings

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            try {
                await MemoryVectorStore.fromDocuments(finalDocs, embeddings)
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData): Promise<any> {
        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            if (flattenDocs[i] && flattenDocs[i].pageContent) {
                finalDocs.push(new Document(flattenDocs[i]))
            }
        }

        const vectorStore = await MemoryVectorStore.fromDocuments(finalDocs, embeddings)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: InMemoryVectorStore_VectorStores }
