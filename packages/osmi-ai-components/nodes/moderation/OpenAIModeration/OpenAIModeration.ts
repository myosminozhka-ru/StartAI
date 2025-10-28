import { Moderation } from '../Moderation'
import { OpenAIModerationRunner } from './OpenAIModerationRunner'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src'

class OpenAIModeration implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'OpenAI Модерация'
        this.name = 'inputModerationOpenAI'
        this.version = 1.0
        this.type = 'Moderation'
        this.icon = 'openai.svg'
        this.category = 'Moderation'
        this.description = 'Проверьте, соответствует ли контент политикам использования OpenAI.'
        this.baseClasses = [this.type, ...getBaseClasses(Moderation)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openAIApi']
        }
        this.inputs = [
            {
                label: 'Сообщение об ошибке',
                name: 'moderationErrorMessage',
                type: 'string',
                rows: 2,
                default: 'Невозможно обработать! Ввод нарушает политики модерации контента OpenAI.',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const openAIApiKey = getCredentialParam('openAIApiKey', credentialData, nodeData)

        const runner = new OpenAIModerationRunner(openAIApiKey)
        const moderationErrorMessage = nodeData.inputs?.moderationErrorMessage as string
        if (moderationErrorMessage) runner.setErrorMessage(moderationErrorMessage)
        return runner
    }
}

module.exports = { nodeClass: OpenAIModeration }
