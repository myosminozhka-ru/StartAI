import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IServerSideEventStreamer
} from '../../../src/Interface'
import { updateFlowState } from '../utils'
import { DataSource } from 'typeorm'
import { BaseRetriever } from '@langchain/core/retrievers'
import { Document } from '@langchain/core/documents'

interface IKnowledgeBase {
    documentStore: string
}

class Retriever_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideOutput: boolean
    hint: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Извлечение'
        this.name = 'retrieverAgentflow'
        this.version = 1.0
        this.type = 'Retriever'
        this.category = 'Agent Flows'
        this.description = 'Извлечение информации из векторной базы данных'
        this.baseClasses = [this.type]
        this.color = '#b8bedd'
        this.inputs = [
            {
                label: 'База знаний (Хранилища документов)',
                name: 'retrieverKnowledgeDocumentStores',
                type: 'array',
                description: 'Хранилища документов для извлечения информации. Документы должны быть предварительно загружены.',
                array: [
                    {
                        label: 'Хранилище документов',
                        name: 'documentStore',
                        type: 'asyncOptions',
                        loadMethod: 'listStores'
                    }
                ]
            },
            {
                label: 'Запрос для извлечения',
                name: 'retrieverQuery',
                type: 'string',
                placeholder: 'Введите ваш запрос здесь',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Формат вывода',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { label: 'Текст', name: 'text' },
                    { label: 'Текст с метаданными', name: 'textWithMetadata' }
                ],
                default: 'text'
            },
            {
                label: 'Обновить состояние потока',
                name: 'retrieverUpdateState',
                description: 'Обновить состояние выполнения во время работы потока',
                type: 'array',
                optional: true,
                acceptVariable: true,
                array: [
                    {
                        label: 'Ключ',
                        name: 'key',
                        type: 'asyncOptions',
                        loadMethod: 'listRuntimeStateKeys',
                        freeSolo: true
                    },
                    {
                        label: 'Значение',
                        name: 'value',
                        type: 'string',
                        acceptVariable: true,
                        acceptNodeOutputAsVariable: true
                    }
                ]
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        },
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
                if (store.status === 'UPSERTED') {
                    const obj = {
                        name: `${store.id}:${store.name}`,
                        label: store.name,
                        description: store.description
                    }
                    returnData.push(obj)
                }
            }
            return returnData
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const retrieverQuery = nodeData.inputs?.retrieverQuery as string
        const outputFormat = nodeData.inputs?.outputFormat as string
        const _retrieverUpdateState = nodeData.inputs?.retrieverUpdateState

        const state = options.agentflowRuntime?.state as ICommonObject
        const chatId = options.chatId as string
        const isLastNode = options.isLastNode as boolean
        const isStreamable = isLastNode && options.sseStreamer !== undefined

        const abortController = options.abortController as AbortController

        // Extract knowledge
        let docs: Document[] = []
        const knowledgeBases = nodeData.inputs?.retrieverKnowledgeDocumentStores as IKnowledgeBase[]
        if (knowledgeBases && knowledgeBases.length > 0) {
            for (const knowledgeBase of knowledgeBases) {
                const [storeId, _] = knowledgeBase.documentStore.split(':')

                const docStoreVectorInstanceFilePath = options.componentNodes['documentStoreVS'].filePath as string
                const docStoreVectorModule = await import(docStoreVectorInstanceFilePath)
                const newDocStoreVectorInstance = new docStoreVectorModule.nodeClass()
                const docStoreVectorInstance = (await newDocStoreVectorInstance.init(
                    {
                        ...nodeData,
                        inputs: {
                            ...nodeData.inputs,
                            selectedStore: storeId
                        },
                        outputs: {
                            output: 'retriever'
                        }
                    },
                    '',
                    options
                )) as BaseRetriever

                docs = await docStoreVectorInstance.invoke(retrieverQuery || input, { signal: abortController?.signal })
            }
        }

        const docsText = docs.map((doc) => doc.pageContent).join('\n')

        // Update flow state if needed
        let newState = { ...state }
        if (_retrieverUpdateState && Array.isArray(_retrieverUpdateState) && _retrieverUpdateState.length > 0) {
            newState = updateFlowState(state, _retrieverUpdateState)
        }

        try {
            let finalOutput = ''
            if (outputFormat === 'text') {
                finalOutput = docsText
            } else if (outputFormat === 'textWithMetadata') {
                finalOutput = JSON.stringify(docs, null, 2)
            }

            if (isStreamable) {
                const sseStreamer: IServerSideEventStreamer = options.sseStreamer
                sseStreamer.streamTokenEvent(chatId, finalOutput)
            }

            // Process template variables in state
            if (newState && Object.keys(newState).length > 0) {
                for (const key in newState) {
                    if (newState[key].toString().includes('{{ output }}')) {
                        newState[key] = finalOutput
                    }
                }
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    question: retrieverQuery || input
                },
                output: {
                    content: finalOutput
                },
                state: newState
            }

            return returnOutput
        } catch (e) {
            throw new Error(e)
        }
    }
}

module.exports = { nodeClass: Retriever_Agentflow }
