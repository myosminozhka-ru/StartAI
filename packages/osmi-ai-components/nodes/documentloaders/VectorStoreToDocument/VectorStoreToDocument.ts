import { VectorStore } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { handleEscapeCharacters } from '../../../src/utils'

class VectorStoreToDocument_DocumentLoaders implements INode {
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
        this.label = 'Векторное хранилище в документ'
        this.name = 'vectorStoreToDocument'
        this.version = 2.0
        this.type = 'Document'
        this.icon = 'vectorretriever.svg'
        this.category = 'Document Loaders'
        this.description = 'Поиск документов со оценками из векторного хранилища'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Векторное хранилище',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Запрос',
                name: 'query',
                type: 'string',
                description:
                    'Запрос для получения документов из векторной базы данных. Если не указан, будет использован вопрос пользователя',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Минимальный балл (%)',
                name: 'minScore',
                type: 'number',
                optional: true,
                placeholder: '75',
                step: 1,
                description: 'Минимальный балл для включения документов с эмбеддингами'
            }
        ]
        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документа, содержащих метаданные и содержимое страницы',
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

    async init(nodeData: INodeData, input: string): Promise<any> {
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const minScore = nodeData.inputs?.minScore as number
        const query = nodeData.inputs?.query as string
        const output = nodeData.outputs?.output as string

        const topK = (vectorStore as any)?.k ?? 4
        const _filter = (vectorStore as any)?.filter

        // If it is already pre-defined in lc_kwargs, then don't pass it again
        const filter = vectorStore.lc_kwargs.filter ? undefined : _filter
        if (vectorStore.lc_kwargs.filter) {
            ;(vectorStore as any).filter = vectorStore.lc_kwargs.filter
        }

        const docs = await vectorStore.similaritySearchWithScore(query ?? input, topK, filter)
        // eslint-disable-next-line no-console
        console.log('\x1b[94m\x1b[1m\n*****Документы векторного хранилища*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(docs, null, 2))

        if (output === 'document') {
            let finaldocs = []
            for (const doc of docs) {
                if (minScore && doc[1] < minScore / 100) continue
                finaldocs.push(doc[0])
            }
            return finaldocs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                if (minScore && doc[1] < minScore / 100) continue
                finaltext += `${doc[0].pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: VectorStoreToDocument_DocumentLoaders }
