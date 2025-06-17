import { NodeVM } from '@flowiseai/nodevm'
import { DataSource } from 'typeorm'
import {
    availableDependencies,
    defaultAllowBuiltInDep,
    getCredentialData,
    getCredentialParam,
    getVars,
    prepareSandboxVars
} from '../../../src/utils'
import {
    ICommonObject,
    IDatabaseEntity,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    ISeqAgentNode,
    ISeqAgentsState
} from '../../../src/Interface'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import { v4 as uuidv4 } from 'uuid'

class ExecuteFlow_SeqAgents implements INode {
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

    constructor() {
        this.label = 'Выполнить поток'
        this.name = 'seqExecuteFlow'
        this.version = 1.0
        this.type = 'ExecuteFlow'
        this.icon = 'executeflow.svg'
        this.category = 'Sequential Agents'
        this.description = `Выполнить поток чата/агента и вернуть финальный ответ`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['chatflowApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Последовательный узел',
                name: 'sequentialNode',
                type: 'Start | Agent | Condition | LLMNode | ToolNode | CustomFunction | ExecuteFlow',
                description:
                    'Может быть подключен к одному из следующих узлов: Start, Agent, Condition, LLM Node, Tool Node, Custom Function, Execute Flow',
                list: true
            },
            {
                label: 'Название',
                name: 'seqExecuteFlowName',
                type: 'string'
            },
            {
                label: 'Выбрать поток',
                name: 'selectedFlow',
                type: 'asyncOptions',
                loadMethod: 'listFlows'
            },
            {
                label: 'Входные данные',
                name: 'seqExecuteFlowInput',
                type: 'options',
                description: 'Выберите один из следующих вариантов или введите пользовательские входные данные',
                freeSolo: true,
                loadPreviousNodes: true,
                options: [
                    {
                        label: '{{ question }}',
                        name: 'userQuestion',
                        description: 'Использовать вопрос пользователя из чата как входные данные.'
                    }
                ]
            },
            {
                label: 'Переопределить конфигурацию',
                name: 'overrideConfig',
                description: 'Переопределить конфигурацию, передаваемую в поток.',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Базовый URL',
                name: 'baseURL',
                type: 'string',
                description:
                    'Базовый URL для Flowise. По умолчанию это URL входящего запроса. Полезно, когда вам нужно выполнить поток через альтернативный маршрут.',
                placeholder: 'http://localhost:3000',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Начать новую сессию для каждого сообщения',
                name: 'startNewSession',
                type: 'boolean',
                description:
                    'Продолжить сессию или начать новую с каждым взаимодействием. Полезно для потоков с памятью, если вы хотите избежать этого.',
                default: false,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Возвращать значение как',
                name: 'returnValueAs',
                type: 'options',
                options: [
                    { label: 'AI сообщение', name: 'aiMessage' },
                    { label: 'Сообщение пользователя', name: 'humanMessage' },
                    {
                        label: 'Объект состояния',
                        name: 'stateObj',
                        description:
                            "Вернуть как объект состояния, например: { foo: bar }. Это обновит пользовательское состояние 'foo' на 'bar'"
                    }
                ],
                default: 'aiMessage'
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
                const data = {
                    label: chatflows[i].name,
                    name: chatflows[i].id
                } as INodeOptionsValue
                returnData.push(data)
            }
            return returnData
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const selectedFlowId = nodeData.inputs?.selectedFlow as string
        const _seqExecuteFlowName = nodeData.inputs?.seqExecuteFlowName as string
        if (!_seqExecuteFlowName) throw new Error('Execute Flow node name is required!')
        const seqExecuteFlowName = _seqExecuteFlowName.toLowerCase().replace(/\s/g, '_').trim()
        const startNewSession = nodeData.inputs?.startNewSession as boolean
        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const sequentialNodes = nodeData.inputs?.sequentialNode as ISeqAgentNode[]
        const seqExecuteFlowInput = nodeData.inputs?.seqExecuteFlowInput as string
        const overrideConfig =
            typeof nodeData.inputs?.overrideConfig === 'string' &&
            nodeData.inputs.overrideConfig.startsWith('{') &&
            nodeData.inputs.overrideConfig.endsWith('}')
                ? JSON.parse(nodeData.inputs.overrideConfig)
                : nodeData.inputs?.overrideConfig

        if (!sequentialNodes || !sequentialNodes.length) throw new Error('Execute Flow must have a predecessor!')

        const baseURL = (nodeData.inputs?.baseURL as string) || (options.baseURL as string)
        const returnValueAs = nodeData.inputs?.returnValueAs as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const chatflowApiKey = getCredentialParam('chatflowApiKey', credentialData, nodeData)

        if (selectedFlowId === options.chatflowid) throw new Error('Cannot call the same agentflow!')

        let headers = {}
        if (chatflowApiKey) headers = { Authorization: `Bearer ${chatflowApiKey}` }

        const chatflowId = options.chatflowid
        const sessionId = options.sessionId
        const chatId = options.chatId

        const executeFunc = async (state: ISeqAgentsState) => {
            const variables = await getVars(appDataSource, databaseEntities, nodeData, options)

            let flowInput = ''
            if (seqExecuteFlowInput === 'userQuestion') {
                flowInput = input
            } else if (seqExecuteFlowInput && seqExecuteFlowInput.startsWith('{{') && seqExecuteFlowInput.endsWith('}}')) {
                const nodeId = seqExecuteFlowInput.replace('{{', '').replace('}}', '').replace('$', '').trim()
                const messageOutputs = ((state.messages as unknown as BaseMessage[]) ?? []).filter(
                    (message) => message.additional_kwargs && message.additional_kwargs?.nodeId === nodeId
                )
                const messageOutput = messageOutputs[messageOutputs.length - 1]

                if (messageOutput) {
                    flowInput = JSON.stringify(messageOutput.content)
                }
            }

            const flow = {
                chatflowId,
                sessionId,
                chatId,
                input: flowInput,
                state
            }

            const body = {
                question: flowInput,
                chatId: startNewSession ? uuidv4() : chatId,
                overrideConfig: {
                    sessionId: startNewSession ? uuidv4() : sessionId,
                    ...(overrideConfig ?? {})
                }
            }

            const callOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify(body)
            }

            let sandbox: ICommonObject = {
                $input: flowInput,
                $callOptions: callOptions,
                $callBody: body,
                util: undefined,
                Symbol: undefined,
                child_process: undefined,
                fs: undefined,
                process: undefined
            }
            sandbox['$vars'] = prepareSandboxVars(variables)
            sandbox['$flow'] = flow

            const code = `
    const fetch = require('node-fetch');
    const url = "${baseURL}/api/v1/prediction/${selectedFlowId}";
    
    const body = $callBody;
    
    const options = $callOptions;
    
    try {
        const response = await fetch(url, options);
        const resp = await response.json();
        return resp.text;
    } catch (error) {
        console.error(error);
        return '';
    }
`

            const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
                ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
                : defaultAllowBuiltInDep
            const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
            const deps = availableDependencies.concat(externalDeps)

            const nodeVMOptions = {
                console: 'inherit',
                sandbox,
                require: {
                    external: { modules: deps },
                    builtin: builtinDeps
                },
                eval: false,
                wasm: false,
                timeout: 10000
            } as any

            const vm = new NodeVM(nodeVMOptions)
            try {
                let response = await vm.run(`module.exports = async function() {${code}}()`, __dirname)

                if (typeof response === 'object') {
                    response = JSON.stringify(response)
                }

                if (returnValueAs === 'humanMessage') {
                    return {
                        messages: [
                            new HumanMessage({
                                content: response,
                                additional_kwargs: {
                                    nodeId: nodeData.id
                                }
                            })
                        ]
                    }
                }

                return {
                    messages: [
                        new AIMessage({
                            content: response,
                            additional_kwargs: {
                                nodeId: nodeData.id
                            }
                        })
                    ]
                }
            } catch (e) {
                throw new Error(e)
            }
        }

        const startLLM = sequentialNodes[0].startLLM

        const returnOutput: ISeqAgentNode = {
            id: nodeData.id,
            node: executeFunc,
            name: seqExecuteFlowName,
            label: _seqExecuteFlowName,
            type: 'utilities',
            output: 'ExecuteFlow',
            llm: startLLM,
            startLLM,
            multiModalMessageContent: sequentialNodes[0]?.multiModalMessageContent,
            predecessorAgents: sequentialNodes
        }

        return returnOutput
    }
}

module.exports = { nodeClass: ExecuteFlow_SeqAgents }
