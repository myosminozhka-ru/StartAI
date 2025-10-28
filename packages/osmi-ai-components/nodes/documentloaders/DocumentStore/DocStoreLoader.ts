import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { DataSource } from 'typeorm'
import { Document } from '@langchain/core/documents'
import { handleEscapeCharacters } from '../../../src'

class DocStore_DocumentLoaders implements INode {
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
        this.label = 'Хранилище документов'
        this.name = 'documentStore'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'dstore.svg'
        this.category = 'Document Loaders'
        this.description = `Загрузка данных из предварительно настроенных хранилищ документов`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Выберите хранилище',
                name: 'selectedStore',
                type: 'asyncOptions',
                loadMethod: 'listStores'
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

    //@ts-ignore
    loadMethods = {
        async listStores(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity

            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const stores = await appDataSource.getRepository(databaseEntities['DocumentStore']).findBy(searchOptions)
            for (const store of stores) {
                if (store.status === 'SYNC') {
                    const obj = {
                        name: store.id,
                        label: store.name,
                        description: store.description
                    }
                    returnData.push(obj)
                }
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const selectedStore = nodeData.inputs?.selectedStore as string
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chunks = await appDataSource
            .getRepository(databaseEntities['DocumentStoreFileChunk'])
            .find({ where: { storeId: selectedStore } })
        const output = nodeData.outputs?.output as string

        const finalDocs = []
        for (const chunk of chunks) {
            finalDocs.push(new Document({ pageContent: chunk.pageContent, metadata: JSON.parse(chunk.metadata) }))
        }

        if (output === 'document') {
            return finalDocs
        } else {
            let finaltext = ''
            for (const doc of finalDocs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: DocStore_DocumentLoaders }
