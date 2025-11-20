import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { OpenAI, OpenAISession, ALL_AVAILABLE_OPENAI_MODELS } from 'llamaindex'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class ChatOpenAI_LlamaIndex_LLMs implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    tags: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatOpenAI'
        this.name = 'chatOpenAI_LlamaIndex'
        this.version = 2.0
        this.type = 'ChatOpenAI'
        this.icon = 'openai.svg'
        this.category = 'Chat Models'
        this.description = 'Обертка вокруг OpenAI Chat LLM специально для LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(OpenAI)]
        this.tags = ['LlamaIndex']
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'gpt-3.5-turbo'
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
                label: 'Вероятность Top P',
                name: 'topP',
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
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatOpenAI_LlamaIndex')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as keyof typeof ALL_AVAILABLE_OPENAI_MODELS
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const timeout = nodeData.inputs?.timeout as string
        const basePath = nodeData.inputs?.basepath as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)
        if (!openAIApiKey) {
            throw new Error('OpenAI API key is required. Please provide it via credentials.')
        }

        const obj: Partial<OpenAI> = {
            temperature: parseFloat(temperature),
            model: modelName,
            apiKey: openAIApiKey
        }

        if (basePath) {
            obj.additionalSessionOptions = {
                baseURL: basePath
            }
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (timeout) obj.timeout = parseInt(timeout, 10)
        const openai = new OpenAISession(obj)

        const model = new OpenAI({ ...obj, session: openai })
        return model
    }
}

module.exports = { nodeClass: ChatOpenAI_LlamaIndex_LLMs }
