import { flatten } from 'lodash'
import {
    VectaraStore,
    VectaraLibArgs,
    VectaraFilter,
    VectaraContextConfig,
    VectaraFile,
    MMRConfig
} from '@langchain/community/vectorstores/vectara'
import { Document } from '@langchain/core/documents'
import { Embeddings } from '@langchain/core/embeddings'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getFileFromStorage } from '../../../src'

class Vectara_VectorStores implements INode {
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
        this.label = 'Vectara'
        this.name = 'vectara'
        this.version = 2.0
        this.type = 'Vectara'
        this.icon = 'vectara.png'
        this.category = 'Vector Stores'
        this.description =
            'Загружайте встроенные данные и выполняйте поиск по сходству при запросе с помощью Vectara, поисковой службы на базе LLM'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['vectaraApi']
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
                label: 'Файл',
                name: 'file',
                description:
                    'Файл для загрузки в Vectara. Поддерживаемые типы файлов: https://docs.vectara.com/docs/api-reference/indexing-apis/file-upload/file-upload-filetypes',
                type: 'file',
                optional: true
            },
            {
                label: 'Фильтр метаданных',
                name: 'filter',
                description:
                    'Фильтр для применения к метаданным Vectara. См. <a target="_blank" href="https://docs.OSMIai.com/vector-stores/vectara">документацию</a> о том, как использовать фильтры Vectara.',
                type: 'string',
                additionalParams: true,
                optional: true,
                acceptVariable: true
            },
            {
                label: 'Предложения до',
                name: 'sentencesBefore',
                description: 'Количество предложений для получения перед совпадающим предложением. По умолчанию 2.',
                type: 'number',
                default: 2,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Предложения после',
                name: 'sentencesAfter',
                description: 'Количество предложений для получения после совпадающего предложения. По умолчанию 2.',
                type: 'number',
                default: 2,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Лямбда',
                name: 'lambda',
                description:
                    'Включите гибридный поиск для улучшения точности извлечения, регулируя баланс (от 0 до 1) между нейронным поиском и факторами поиска на основе ключевых слов.' +
                    'Значение 0.0 означает, что используется только нейронный поиск, а значение 1.0 означает, что используется только поиск на основе ключевых слов. По умолчанию 0.0 (только нейронный).',
                default: 0.0,
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Топ K',
                name: 'topK',
                description: 'Количество лучших результатов для получения. По умолчанию 5',
                placeholder: '5',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'MMR K',
                name: 'mmrK',
                description: 'Количество лучших результатов для получения для MMR. По умолчанию 50',
                placeholder: '50',
                type: 'number',
                additionalParams: true,
                optional: true
            },
            {
                label: 'MMR смещение разнообразия',
                name: 'mmrDiversityBias',
                step: 0.1,
                description:
                    'Смещение разнообразия для использования в MMR. Это значение от 0.0 до 1.0' +
                    'Значения ближе к 1.0 оптимизируют для наиболее разнообразных результатов.' +
                    'По умолчанию 0 (MMR отключен)',
                placeholder: '0.0',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Vectara Извлекатель',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Vectara Векторное хранилище',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(VectaraStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
            const customerId = getCredentialParam('customerID', credentialData, nodeData)
            const corpusId = getCredentialParam('corpusID', credentialData, nodeData).split(',')

            const docs = nodeData.inputs?.document as Document[]
            const embeddings = {} as Embeddings
            const vectaraMetadataFilter = nodeData.inputs?.filter as string
            const sentencesBefore = nodeData.inputs?.sentencesBefore as number
            const sentencesAfter = nodeData.inputs?.sentencesAfter as number
            const lambda = nodeData.inputs?.lambda as number
            const fileBase64 = nodeData.inputs?.file

            const vectaraArgs: VectaraLibArgs = {
                apiKey: apiKey,
                customerId: customerId,
                corpusId: corpusId,
                source: 'OSMI'
            }

            const vectaraFilter: VectaraFilter = {}
            if (vectaraMetadataFilter) vectaraFilter.filter = vectaraMetadataFilter
            if (lambda) vectaraFilter.lambda = lambda

            const vectaraContextConfig: VectaraContextConfig = {}
            if (sentencesBefore) vectaraContextConfig.sentencesBefore = sentencesBefore
            if (sentencesAfter) vectaraContextConfig.sentencesAfter = sentencesAfter
            vectaraFilter.contextConfig = vectaraContextConfig

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    finalDocs.push(new Document(flattenDocs[i]))
                }
            }

            const vectaraFiles: VectaraFile[] = []
            let files: string[] = []
            if (fileBase64.startsWith('FILE-STORAGE::')) {
                const fileName = fileBase64.replace('FILE-STORAGE::', '')
                if (fileName.startsWith('[') && fileName.endsWith(']')) {
                    files = JSON.parse(fileName)
                } else {
                    files = [fileName]
                }
                const orgId = options.orgId
                const chatflowid = options.chatflowid

                for (const file of files) {
                    if (!file) continue
                    const fileData = await getFileFromStorage(file, orgId, chatflowid)
                    const blob = new Blob([fileData as BlobPart])
                    vectaraFiles.push({ blob: blob, fileName: getFileName(file) })
                }
            } else {
                if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                    files = JSON.parse(fileBase64)
                } else {
                    files = [fileBase64]
                }

                for (const file of files) {
                    if (!file) continue
                    const splitDataURI = file.split(',')
                    splitDataURI.pop()
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    const blob = new Blob([bf as BlobPart])
                    vectaraFiles.push({ blob: blob, fileName: getFileName(file) })
                }
            }

            try {
                if (finalDocs.length) await VectaraStore.fromDocuments(finalDocs, embeddings, vectaraArgs)
                if (vectaraFiles.length) {
                    const vectorStore = new VectaraStore(vectaraArgs)
                    await vectorStore.addFiles(vectaraFiles)
                }
                return { numAdded: finalDocs.length, addedDocs: finalDocs }
            } catch (e) {
                throw new Error(e)
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
        const customerId = getCredentialParam('customerID', credentialData, nodeData)
        const corpusId = getCredentialParam('corpusID', credentialData, nodeData).split(',')

        const vectaraMetadataFilter = nodeData.inputs?.filter as string
        const sentencesBefore = nodeData.inputs?.sentencesBefore as number
        const sentencesAfter = nodeData.inputs?.sentencesAfter as number
        const lambda = nodeData.inputs?.lambda as number
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 5
        const mmrK = nodeData.inputs?.mmrK as number
        const mmrDiversityBias = nodeData.inputs?.mmrDiversityBias as number

        const vectaraArgs: VectaraLibArgs = {
            apiKey: apiKey,
            customerId: customerId,
            corpusId: corpusId,
            source: 'OSMI'
        }

        const vectaraFilter: VectaraFilter = {}
        if (vectaraMetadataFilter) vectaraFilter.filter = vectaraMetadataFilter
        if (lambda) vectaraFilter.lambda = lambda

        const vectaraContextConfig: VectaraContextConfig = {}
        if (sentencesBefore) vectaraContextConfig.sentencesBefore = sentencesBefore
        if (sentencesAfter) vectaraContextConfig.sentencesAfter = sentencesAfter
        vectaraFilter.contextConfig = vectaraContextConfig
        const mmrConfig: MMRConfig = {}
        mmrConfig.enabled = mmrDiversityBias > 0
        mmrConfig.mmrTopK = mmrK
        mmrConfig.diversityBias = mmrDiversityBias
        vectaraFilter.mmrConfig = mmrConfig

        const vectorStore = new VectaraStore(vectaraArgs)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k, vectaraFilter)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            if (vectaraMetadataFilter) {
                ;(vectorStore as any).filter = vectaraFilter.filter
            }
            return vectorStore
        }
        return vectorStore
    }
}

const getFileName = (fileBase64: string) => {
    let fileNames = []
    if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
        const files = JSON.parse(fileBase64)
        for (const file of files) {
            const splitDataURI = file.split(',')
            const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
            fileNames.push(filename)
        }
        return fileNames.join(', ')
    } else {
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI[splitDataURI.length - 1].split(':')[1]
        return filename
    }
}

module.exports = { nodeClass: Vectara_VectorStores }
