import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import { ChatResult } from '@langchain/core/outputs'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

// Полифилл для fetch если не доступен
const fetchApi = globalThis.fetch || require('node-fetch')

class ChatMWS extends BaseChatModel {
    declare modelName: string
    declare apiKey: string
    declare baseURL: string
    declare temperature: number
    declare maxTokens?: number
    declare topP?: number
    declare frequencyPenalty?: number
    declare presencePenalty?: number
    declare timeout?: number
    declare streaming: boolean

    constructor(fields: {
        modelName?: string
        apiKey: string
        baseURL?: string
        temperature?: number
        maxTokens?: number
        topP?: number
        frequencyPenalty?: number
        presencePenalty?: number
        timeout?: number
        streaming?: boolean
    }) {
        super({})
        this.modelName = fields.modelName || 'mws-gpt-alpha'
        this.apiKey = fields.apiKey
        this.baseURL = fields.baseURL || 'https://api.gpt.mws.ru/v1'
        this.temperature = fields.temperature || 0.9
        this.maxTokens = fields.maxTokens
        this.topP = fields.topP
        this.frequencyPenalty = fields.frequencyPenalty
        this.presencePenalty = fields.presencePenalty
        this.timeout = fields.timeout
        this.streaming = fields.streaming || false
    }

    _llmType(): string {
        return 'mws'
    }

    private formatMessages(messages: BaseMessage[]): any[] {
        return messages.map((message) => {
            if (message instanceof HumanMessage) {
                return { role: 'user', content: message.content }
            } else if (message instanceof AIMessage) {
                return { role: 'assistant', content: message.content }
            } else if (message instanceof SystemMessage) {
                return { role: 'system', content: message.content }
            }
            return { role: 'user', content: message.content }
        })
    }

    async _generate(
        messages: BaseMessage[],
        options?: any,
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        const formattedMessages = this.formatMessages(messages)
        
        const requestBody: any = {
            model: this.modelName,
            messages: formattedMessages,
            temperature: this.temperature,
            stream: false
        }

        if (this.maxTokens) requestBody.max_tokens = this.maxTokens
        if (this.topP) requestBody.top_p = this.topP
        if (this.frequencyPenalty) requestBody.frequency_penalty = this.frequencyPenalty
        if (this.presencePenalty) requestBody.presence_penalty = this.presencePenalty

        const response = await fetchApi(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            throw new Error(`MWS API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const message = new AIMessage(data.choices[0].message.content)

        return {
            generations: [
                {
                    text: data.choices[0].message.content,
                    message
                }
            ]
        }
    }
}

class ChatMWS_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatMWS'
        this.name = 'chatMWS'
        this.version = 2.0
        this.type = 'ChatMWS'
        this.icon = 'mws.svg'
        this.category = 'Модели чата'
        this.description = 'Обертка вокруг языковых моделей MWS (МТС), использующая Chat Completions API'
        this.baseClasses = [this.type, ...getBaseClasses(ChatMWS)]
        this.credential = {
            label: 'Соединить учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mwsApi']
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'mws-gpt-alpha'
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Максимум токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Вероятность топ P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф частоты',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф присутствия',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Таймаут',
                name: 'timeout',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Базовый путь',
                name: 'basepath',
                type: 'string',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Разрешить загрузку изображений',
                name: 'allowImageUploads',
                type: 'boolean',
                description: 'Автоматически обрабатывает загруженные изображения при их прикреплении к чату. Поддерживается только с LLMChain, Conversation Chain, ReAct Agent и Conversational Agent',
                default: false,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
            const mwsApiBaseUrl = getCredentialParam('mwsApiBaseUrl', credentialData, nodeData) || 'https://api.gpt.mws.ru/v1'

            if (!mwsApiKey) {
                return getModels(MODEL_TYPE.CHAT, 'chatMWS')
            }

            try {
                const response = await fetchApi(`${mwsApiBaseUrl}/models`, {
                    headers: {
                        'Authorization': `Bearer ${mwsApiKey}`,
                        'Content-Type': 'application/json'
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                
                return data.data?.map((model: any) => ({
                    label: model.id,
                    name: model.id,
                    description: model.id
                })) || []
            } catch (error) {
                console.warn('Ошибка при загрузке моделей MWS, используем статичные модели:', error)
                return getModels(MODEL_TYPE.CHAT, 'chatMWS')
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<ChatMWS> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basepath as string
        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)
        const mwsApiBaseUrl = getCredentialParam('mwsApiBaseUrl', credentialData, nodeData) || 'https://api.gpt.mws.ru/v1'

        if (!mwsApiKey) throw new Error('MWS API Key не найден')

        const obj: any = {
            temperature: parseFloat(temperature) || 0.9,
            modelName,
            apiKey: mwsApiKey,
            baseURL: basePath || mwsApiBaseUrl,
            streaming: options.socketIO ? true : false
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)
        if (timeout) obj.timeout = parseInt(timeout, 10)

        const model = new ChatMWS(obj)

        // TODO: Добавить поддержку изображений в будущих версиях
        if (allowImageUploads) {
            console.log('Поддержка изображений будет добавлена в следующих версиях MWS')
        }

        return model
    }
}

module.exports = { nodeClass: ChatMWS_ChatModels }
