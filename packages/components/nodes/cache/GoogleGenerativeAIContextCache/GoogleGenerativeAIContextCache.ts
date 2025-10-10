import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'
import FlowiseGoogleAICacheManager from './FlowiseGoogleAICacheManager'

class GoogleGenerativeAIContextCache implements INode {
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
        this.label = 'Кэш контекста Google GenAI'
        this.name = 'googleGenerativeAIContextCache'
        this.version = 1.0
        this.type = 'GoogleAICacheManager'
        this.description = 'Большой кэш контекста для больших языковых моделей Google Gemini'
        this.icon = 'GoogleGemini.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(FlowiseGoogleAICacheManager)]
        this.inputs = [
            {
                label: 'Время жизни кэша',
                name: 'ttl',
                type: 'number',
                default: 60 * 60 * 24 * 30
            }
        ]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleGenerativeAI'],
            optional: false,
            description: 'Учетные данные Google Generative AI.'
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const ttl = nodeData.inputs?.ttl as number
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('googleGenerativeAPIKey', credentialData, nodeData)
        const manager = new FlowiseGoogleAICacheManager(apiKey)
        manager.setTtlSeconds(ttl)
        return manager
    }
}

module.exports = { nodeClass: GoogleGenerativeAIContextCache }
