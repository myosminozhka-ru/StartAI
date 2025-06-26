import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BaseCache } from '@langchain/core/caches'
import { ChatYandexGPT } from '@langchain/yandex/chat_models'
import { AIMessage } from '@langchain/core/messages'

function _parseChatHistory(history: any[]): { role: string, text: string }[] {
    /**
     * Преобразует сообщения в формат, ожидаемый YandexGPT
     */
    const chatHistory = [];
    for (const message of history) {
        if (typeof message.content !== 'string') {
            throw new Error('ChatYandexGPT поддерживает только string content.');
        }
        if ('content' in message) {
            if (typeof message._getType === 'function') {
                if (message._getType() === 'human') {
                    chatHistory.push({ role: 'user', text: message.content });
                } else if (message._getType() === 'ai') {
                    chatHistory.push({ role: 'assistant', text: message.content });
                } else if (message._getType() === 'system') {
                    chatHistory.push({ role: 'system', text: message.content });
                }
            }
        }
    }
    return chatHistory;
}

class LocalChatYandexGPT extends ChatYandexGPT {
    /**
     * Переопределяем _generate для логирования тела ошибки и корректного формирования истории
     */
    async _generate(messages: any, options: any, _runManager?: any): Promise<any> {
        const messageHistory = _parseChatHistory(messages);
        const headers: any = {
            'Content-Type': 'application/json',
            Authorization: '',
            'x-folder-id': '',
        };
        if (this.apiKey !== undefined) {
            headers.Authorization = `Api-Key ${this.apiKey}`;
            if (this.folderID !== undefined) {
                headers['x-folder-id'] = this.folderID;
            }
        } else {
            headers.Authorization = `Bearer ${this.iamToken}`;
        }
        const bodyData = {
            modelUri: this.modelURI,
            completionOptions: {
                temperature: this.temperature,
                maxTokens: this.maxTokens,
            },
            messages: messageHistory,
        };
        const apiUrl = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyData),
            signal: options?.signal,
        });
        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = '[не удалось прочитать тело ответа]';
            }
            console.error('YandexGPT fetch error:', response.status, errorText);
            throw new Error(`Failed to fetch ${apiUrl} from YandexGPT: ${response.status} - ${errorText}`);
        }
        // Логируем тело ответа
        const rawText = await response.text();
        console.log('YandexGPT raw response:', rawText);
        let responseData;
        try {
            responseData = JSON.parse(rawText);
        } catch (e) {
            console.error('Ошибка парсинга JSON от YandexGPT:', e, rawText);
            throw new Error('Ошибка парсинга JSON от YandexGPT');
        }
        console.log('YandexGPT parsed response:', responseData);
        const { result } = responseData;
        if (!result) {
            console.error('Нет поля result в ответе YandexGPT:', responseData);
            throw new Error('Нет поля result в ответе YandexGPT');
        }
        const { text } = result.alternatives[0].message;
        const { totalTokens } = result.usage;
        const generations = [
            { text, message: new AIMessage(text) },
        ];
        return {
            generations,
            llmOutput: { totalTokens },
        };
    }
}

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
        // const modelName = nodeData.inputs?.modelName as string
        const streaming = nodeData.inputs?.streaming as boolean ?? true
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const cache = nodeData.inputs?.cache as BaseCache

        // Удалите конфликтующие параметры
        const params: any = {
            temperature: parseFloat(temperature),
            streaming: streaming,
            // iamToken: iamToken,
            modelURI: modelURI,
            // folderID: folderID,
        };

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
        // const model = new ChatYandexGPT(params);
        const model = new LocalChatYandexGPT(params); // Используем локальную версию для отладки
        (model as any).bindTools = (tools: any[]) => {
            (model as any).tools = tools;
            return model;
        };
        if (cache) model.cache = cache;
        return model;
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