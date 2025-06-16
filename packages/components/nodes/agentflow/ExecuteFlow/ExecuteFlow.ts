import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IServerSideEventStreamer
} from '../../../src/Interface'
import axios, { AxiosRequestConfig } from 'axios'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { DataSource } from 'typeorm'
import { BaseMessageLike } from '@langchain/core/messages'
import { updateFlowState } from '../utils'

class ExecuteFlow_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Выполнить поток'
        this.name = 'executeFlowAgentflow'
        this.version = 1.0
        this.type = 'ExecuteFlow'
        this.category = 'Agent Flows'
        this.description = 'Выполнить другой поток'
        this.baseClasses = [this.type]
        this.color = '#a3b18a'
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['chatflowApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Выбрать поток',
                name: 'executeFlowSelectedFlow',
                type: 'asyncOptions',
                loadMethod: 'listFlows'
            },
            {
                label: 'Ввод',
                name: 'executeFlowInput',
                type: 'string',
                rows: 4,
                acceptVariable: true
            },
            {
                label: 'Переопределить конфигурацию',
                name: 'executeFlowOverrideConfig',
                description: 'Переопределить конфигурацию, передаваемую в поток',
                type: 'json',
                optional: true
            },
            {
                label: 'Базовый URL',
                name: 'executeFlowBaseURL',
                type: 'string',
                description:
                    'Базовый URL для Flowise. По умолчанию используется URL входящего запроса. Полезно, когда нужно выполнить поток через альтернативный маршрут.',
                placeholder: 'http://localhost:3000',
                optional: true
            },
            {
                label: 'Вернуть ответ как',
                name: 'executeFlowReturnResponseAs',
                type: 'options',
                options: [
                    {
                        label: 'Сообщение пользователя',
                        name: 'userMessage'
                    },
                    {
                        label: 'Сообщение ассистента',
                        name: 'assistantMessage'
                    }
                ],
                default: 'userMessage'
            },
            {
                label: 'Обновить состояние потока',
                name: 'executeFlowUpdateState',
                description: 'Обновить состояние выполнения во время выполнения рабочего процесса',
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
        async listFlows(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const returnData: INodeOptionsValue[] = []

            const appDataSource = options.appDataSource as DataSource
            const databaseEntities = options.databaseEntities as IDatabaseEntity
            if (appDataSource === undefined || !appDataSource) {
                return returnData
            }

            const searchOptions = options.searchOptions || {}
            const chatflows = await appDataSource.getRepository(databaseEntities['ChatFlow']).findBy(searchOptions)

            for (let i = 0; i < chatflows.length; i += 1) {
                let cfType = 'Поток чата'
                if (chatflows[i].type === 'AGENTFLOW') {
                    cfType = 'Поток агентов V2'
                } else if (chatflows[i].type === 'MULTIAGENT') {
                    cfType = 'Поток агентов V1'
                }
                const data = {
                    label: chatflows[i].name,
                    name: chatflows[i].id,
                    description: cfType
                } as INodeOptionsValue
                returnData.push(data)
            }

            // сортировка по метке
            return returnData.sort((a, b) => a.label.localeCompare(b.label))
        },
        async listRuntimeStateKeys(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const previousNodes = options.previousNodes as ICommonObject[]
            const startAgentflowNode = previousNodes.find((node) => node.name === 'startAgentflow')
            const state = startAgentflowNode?.inputs?.startState as ICommonObject[]
            return state.map((item) => ({ label: item.key, name: item.key }))
        }
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const baseURL = (nodeData.inputs?.executeFlowBaseURL as string) || (options.baseURL as string)
        const selectedFlowId = nodeData.inputs?.executeFlowSelectedFlow as string
        const flowInput = nodeData.inputs?.executeFlowInput as string
        const returnResponseAs = nodeData.inputs?.executeFlowReturnResponseAs as string
        const _executeFlowUpdateState = nodeData.inputs?.executeFlowUpdateState
        const overrideConfig =
            typeof nodeData.inputs?.executeFlowOverrideConfig === 'string' &&
            nodeData.inputs.executeFlowOverrideConfig.startsWith('{') &&
            nodeData.inputs.executeFlowOverrideConfig.endsWith('}')
                ? JSON.parse(nodeData.inputs.executeFlowOverrideConfig)
                : nodeData.inputs?.executeFlowOverrideConfig

        const state = options.agentflowRuntime?.state as ICommonObject
        const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []
        const isLastNode = options.isLastNode as boolean
        const sseStreamer: IServerSideEventStreamer | undefined = options.sseStreamer

        try {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const chatflowApiKey = getCredentialParam('chatflowApiKey', credentialData, nodeData)

            if (selectedFlowId === options.chatflowid) throw new Error('Нельзя вызывать тот же поток агентов!')

            let headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (chatflowApiKey) headers = { ...headers, Authorization: `Bearer ${chatflowApiKey}` }

            const finalUrl = `${baseURL}/api/v1/prediction/${selectedFlowId}`
            const requestConfig: AxiosRequestConfig = {
                method: 'POST',
                url: finalUrl,
                headers,
                data: {
                    question: flowInput,
                    chatId: options.chatId,
                    overrideConfig
                }
            }

            const response = await axios(requestConfig)

            let resultText = ''
            if (response.data.text) resultText = response.data.text
            else if (response.data.json) resultText = '```json\n' + JSON.stringify(response.data.json, null, 2)
            else resultText = JSON.stringify(response.data, null, 2)

            if (isLastNode && sseStreamer) {
                sseStreamer.streamTokenEvent(options.chatId, resultText)
            }

            // Update flow state if needed
            let newState = { ...state }
            if (_executeFlowUpdateState && Array.isArray(_executeFlowUpdateState) && _executeFlowUpdateState.length > 0) {
                newState = updateFlowState(state, _executeFlowUpdateState)
            }

            // Process template variables in state
            if (newState && Object.keys(newState).length > 0) {
                for (const key in newState) {
                    if (newState[key].toString().includes('{{ output }}')) {
                        newState[key] = resultText
                    }
                }
            }

            // Only add to runtime chat history if this is the first node
            const inputMessages = []
            if (!runtimeChatHistory.length) {
                inputMessages.push({ role: 'user', content: flowInput })
            }

            let returnRole = 'user'
            if (returnResponseAs === 'assistantMessage') {
                returnRole = 'assistant'
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: flowInput
                        }
                    ]
                },
                output: {
                    content: resultText
                },
                state: newState,
                chatHistory: [
                    ...inputMessages,
                    {
                        role: returnRole,
                        content: resultText,
                        name: nodeData?.label ? nodeData?.label.toLowerCase().replace(/\s/g, '_').trim() : nodeData?.id
                    }
                ]
            }

            return returnOutput
        } catch (error) {
            console.error('Ошибка ExecuteFlow:', error)

            // Format error response
            const errorResponse: any = {
                id: nodeData.id,
                name: this.name,
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: flowInput
                        }
                    ]
                },
                error: {
                    name: error.name || 'Ошибка',
                    message: error.message || 'Произошла ошибка во время выполнения потока'
                },
                state
            }

            // Add more error details if available
            if (error.response) {
                errorResponse.error.status = error.response.status
                errorResponse.error.statusText = error.response.statusText
                errorResponse.error.data = error.response.data
                errorResponse.error.headers = error.response.headers
            }

            throw new Error(error)
        }
    }
}

module.exports = { nodeClass: ExecuteFlow_Agentflow }
