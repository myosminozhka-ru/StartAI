import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BaseCache } from '@langchain/core/caches'
import { ChatYandexGPT } from '@langchain/yandex/chat_models'

class ChatYandexGPT_ChatModels implements INode {
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
        this.label = 'ChatYandexGPT'
        this.name = 'chatYandexGPT'
        this.version = 1.0
        this.type = 'ChatYandexGPT'
        this.icon = 'ChatYandexGPT.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around Chat YandexGPT large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatYandexGPT)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['chatYandexGPT'],
            optional: false,
            description: 'YandexGPT credential.'
        }
        this.inputs = [
            {
                label: 'Cache',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'yandexgpt-lite'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('chatYandexGPTAPIKey', credentialData, nodeData)
        const iamToken = getCredentialParam('chatYandexGptIamToken', credentialData, nodeData)
        const modelURI = getCredentialParam('chatYandexGptModelURI', credentialData, nodeData)
        const folderID = getCredentialParam('chatYandexGptFolderID', credentialData, nodeData)
        const modelVersion = getCredentialParam('chatYandexGptModelVersion', credentialData, nodeData)

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: any = {
            temperature: parseFloat(temperature),
            modelName: modelName,
            maxOutputTokens: 2048,
            streaming: true
        }
        if (apiKey) obj.apiKey = apiKey
        if (iamToken) obj.iamToken = iamToken
        if (folderID) obj.folderID = folderID
        if (modelURI) obj.modelURI = modelURI
        if (modelVersion) obj.modelVersion = modelVersion
        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        const model = new ChatYandexGPT(obj)
        if (cache) model.cache = cache
        return model
    }

    async listModels(): Promise<any[]> {
        return [
            {
                label: 'yandexgpt-lite',
                name: 'yandexgpt-lite',
                description: 'Легкая модель YandexGPT для быстрых ответов'
            },
            {
                label: 'yandexgpt',
                name: 'yandexgpt',
                description: 'Базовая модель YandexGPT'
            },
            {
                label: 'yandexgpt-pro',
                name: 'yandexgpt-pro',
                description: 'Продвинутая модель YandexGPT для сложных задач'
            }
        ]
    }
}

module.exports = { nodeClass: ChatYandexGPT_ChatModels }