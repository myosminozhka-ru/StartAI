import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'
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
            },
            {
                label: 'Streaming',
                name: 'streaming',
                type: 'boolean',
                default: true,
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

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const streaming = nodeData.inputs?.streaming as boolean ?? true
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const cache = nodeData.inputs?.cache as BaseCache

        // Удалите конфликтующие параметры
        const params: any = {
            temperature: parseFloat(temperature),
            streaming: streaming,
            modelName: modelName,
        };
        if (modelURI) {
            params.modelURI = modelURI;
        } else if (folderID) {
            params.folderID = folderID;
        } else {
            throw new Error('Необходим folderID или modelURI');
        }

        if (apiKey) {
            params.apiKey = apiKey;
        } else if (iamToken) {
            params.iamToken = iamToken;
        } else {
            throw new Error('Необходим API-ключ или IAM-токен');
        }

        // Добавляем maxTokens, если указано
        if (maxOutputTokens) {
            params.maxTokens = parseInt(maxOutputTokens, 10);
        }

        console.log('YandexGPT params:', params)
        const model = new ChatYandexGPT(params);
        (model as any).bindTools = (tools: any[]) => {
            (model as any).tools = tools;
            return model;
        };
        if (cache) model.cache = cache;
        return model;
    }
    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            console.log('[ChatYandexGPT] Вызван listModels');
            const models = await getModels(MODEL_TYPE.CHAT, 'chatYandexGPT')
            console.log('[ChatYandexGPT] Модели, полученные из getModels:', models);
            return models
        }
    }
}   

module.exports = { nodeClass: ChatYandexGPT_ChatModels }