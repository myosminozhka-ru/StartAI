import path from 'path'
import { flatten } from 'lodash'
import { storageContextFromDefaults, serviceContextFromDefaults, VectorStoreIndex, Document } from 'llamaindex'
import { Document as LCDocument } from 'langchain/document'
import { INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getUserHome } from '../../../src'

class SimpleStoreUpsert_LlamaIndex_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'SimpleStore'
        this.name = 'simpleStoreLlamaIndex'
        this.version = 1.0
        this.type = 'SimpleVectorStore'
        this.icon = 'simplevs.svg'
        this.category = 'Vector Stores'
        this.description = 'Загружайте встроенные данные в локальный путь и выполняйте поиск по сходству'
        this.baseClasses = [this.type, 'VectorIndexRetriever']
        this.tags = ['LlamaIndex']
        this.inputs = [
            {
                label: 'Документ',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Чат модель',
                name: 'model',
                type: 'BaseChatModel_LlamaIndex'
            },
            {
                label: 'Встраивания',
                name: 'embeddings',
                type: 'BaseEmbedding_LlamaIndex'
            },
            {
                label: 'Базовый путь для хранения',
                name: 'basePath',
                description:
                    'Путь для хранения постоянных индексов встраиваний. Если не указан, по умолчанию используется тот же путь, где хранится база данных',
                type: 'string',
                optional: true
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
                label: 'SimpleStore Извлекатель',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'SimpleStore Индекс векторного хранилища',
                name: 'vectorStore',
                baseClasses: [this.type, 'VectorStoreIndex']
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData): Promise<Partial<IndexingResult>> {
            const basePath = nodeData.inputs?.basePath as string
            const docs = nodeData.inputs?.document as LCDocument[]
            const embeddings = nodeData.inputs?.embeddings
            const model = nodeData.inputs?.model

            let filePath = ''
            if (!basePath) filePath = path.join(getUserHome(), '.OSMI', 'llamaindex')
            else filePath = basePath

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                finalDocs.push(new LCDocument(flattenDocs[i]))
            }

            const llamadocs: Document[] = []
            for (const doc of finalDocs) {
                llamadocs.push(new Document({ text: doc.pageContent, metadata: doc.metadata }))
            }

            const serviceContext = serviceContextFromDefaults({ llm: model, embedModel: embeddings })
            const storageContext = await storageContextFromDefaults({ persistDir: filePath })

            try {
                await VectorStoreIndex.fromDocuments(llamadocs, { serviceContext, storageContext })
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData): Promise<any> {
        const basePath = nodeData.inputs?.basePath as string
        const embeddings = nodeData.inputs?.embeddings
        const model = nodeData.inputs?.model
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4

        let filePath = ''
        if (!basePath) filePath = path.join(getUserHome(), '.OSMI', 'llamaindex')
        else filePath = basePath

        const serviceContext = serviceContextFromDefaults({ llm: model, embedModel: embeddings })
        const storageContext = await storageContextFromDefaults({ persistDir: filePath })

        const index = await VectorStoreIndex.init({ storageContext, serviceContext })

        const output = nodeData.outputs?.output as string

        if (output === 'retriever') {
            const retriever = index.asRetriever()
            retriever.similarityTopK = k
            ;(retriever as any).serviceContext = serviceContext
            return retriever
        } else if (output === 'vectorStore') {
            ;(index as any).k = k
            return index
        }
        return index
    }
}

module.exports = { nodeClass: SimpleStoreUpsert_LlamaIndex_VectorStores }
