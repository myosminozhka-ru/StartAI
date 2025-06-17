import { BaseCache } from '@langchain/core/caches'
import { ChatVertexAI as LcChatVertexAI, ChatVertexAIInput } from '@langchain/google-vertexai'
import {
    ICommonObject,
    IMultiModalOption,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams,
    IVisionChatModal
} from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

const DEFAULT_IMAGE_MAX_TOKEN = 8192
const DEFAULT_IMAGE_MODEL = 'gemini-1.5-flash-latest'

class ChatVertexAI extends LcChatVertexAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken: number
    multiModalOption: IMultiModalOption
    id: string

    constructor(id: string, fields?: ChatVertexAIInput) {
        // @ts-ignore
        if (fields?.model) {
            fields.modelName = fields.model
            delete fields.model
        }
        super(fields ?? {})
        this.id = id
        this.configuredModel = fields?.modelName || ''
        this.configuredMaxToken = fields?.maxOutputTokens ?? 2048
    }

    revertToOriginalModel(): void {
        this.modelName = this.configuredModel
        this.maxOutputTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        if (!this.modelName.startsWith('claude-3')) {
            this.modelName = DEFAULT_IMAGE_MODEL
            this.maxOutputTokens = this.configuredMaxToken ? this.configuredMaxToken : DEFAULT_IMAGE_MAX_TOKEN
        }
    }
}

class GoogleVertexAI_ChatModels implements INode {
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
        this.label = 'ChatGoogleVertexAI'
        this.name = 'chatGoogleVertexAI'
        this.version = 5.1
        this.type = 'ChatGoogleVertexAI'
        this.icon = 'GoogleVertex.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around VertexAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatVertexAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth'],
            optional: true,
            description:
                'Учетные данные Google Vertex AI. Если вы используете сервис GCP, такой как Cloud Run, или если у вас установлены учетные данные по умолчанию на локальной машине, вам не нужно устанавливать эти учетные данные.'
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
                loadMethod: 'listModels'
            },
            {
                label: 'Пользовательское название модели',
                name: 'customModelName',
                type: 'string',
                placeholder: 'gemini-1.5-pro-exp-0801',
                description: 'Пользовательское название модели для использования. Если указано, переопределит выбранную модель',
                additionalParams: true,
                optional: true
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
                label: 'Разрешить загрузку изображений',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Разрешить ввод изображений. См. <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">документацию</a> для получения дополнительной информации.',
                default: false,
                optional: true
            },
            {
                label: 'Потоковая передача',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Максимум выходных токенов',
                name: 'maxOutputTokens',
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
                label: 'Top K токенов с наивысшей вероятностью',
                name: 'topK',
                type: 'number',
                description: `Декодирование с использованием top-k сэмплинга: рассмотрите набор из top_k наиболее вероятных токенов. Должно быть положительным`,
                step: 1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'chatGoogleVertexAI')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)
        const googleApplicationCredential = getCredentialParam('googleApplicationCredential', credentialData, nodeData)
        const projectID = getCredentialParam('projectID', credentialData, nodeData)

        const authOptions: ICommonObject = {}
        if (Object.keys(credentialData).length !== 0) {
            if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
                throw new Error('Please specify your Google Application Credential')
            if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
                throw new Error(
                    'Error: More than one component has been inputted. Please use only one of the following: Google Application Credential File Path or Google Credential JSON Object'
                )
            if (googleApplicationCredentialFilePath && !googleApplicationCredential)
                authOptions.keyFile = googleApplicationCredentialFilePath
            else if (!googleApplicationCredentialFilePath && googleApplicationCredential)
                authOptions.credentials = JSON.parse(googleApplicationCredential)

            if (projectID) authOptions.projectId = projectID
        }

        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const customModelName = nodeData.inputs?.customModelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const cache = nodeData.inputs?.cache as BaseCache
        const topK = nodeData.inputs?.topK as string
        const streaming = nodeData.inputs?.streaming as boolean

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const obj: ChatVertexAIInput = {
            temperature: parseFloat(temperature),
            modelName: customModelName || modelName,
            streaming: streaming ?? true
        }
        if (Object.keys(authOptions).length !== 0) obj.authOptions = authOptions
        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (cache) obj.cache = cache
        if (topK) obj.topK = parseFloat(topK)

        const model = new ChatVertexAI(nodeData.id, obj)
        model.setMultiModalOption(multiModalOption)

        return model
    }
}

module.exports = { nodeClass: GoogleVertexAI_ChatModels }
