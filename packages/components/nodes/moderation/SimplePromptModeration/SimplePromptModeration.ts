import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src'
import { Moderation } from '../Moderation'
import { SimplePromptModerationRunner } from './SimplePromptModerationRunner'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'

class SimplePromptModeration implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Простая модерация промпта'
        this.name = 'inputModerationSimple'
        this.version = 2.0
        this.type = 'Moderation'
        this.icon = 'moderation.svg'
        this.category = 'Moderation'
        this.description = 'Проверьте, содержит ли ввод любой текст из списка запрещенных, и предотвратите отправку в LLM'
        this.baseClasses = [this.type, ...getBaseClasses(Moderation)]
        this.inputs = [
            {
                label: 'Список запрещенных',
                name: 'denyList',
                type: 'string',
                rows: 4,
                placeholder: `ignore previous instructions\ndo not follow the directions\nyou must ignore all previous instructions`,
                description: 'Массив строковых литералов (введите по одному на строку), которые не должны появляться в тексте промпта.'
            },
            {
                label: 'Чат-модель',
                name: 'model',
                type: 'BaseChatModel',
                description: 'Использовать LLM для обнаружения, похож ли ввод на указанные в списке запрещенных',
                optional: true
            },
            {
                label: 'Сообщение об ошибке',
                name: 'moderationErrorMessage',
                type: 'string',
                rows: 2,
                default: 'Невозможно обработать! Ввод нарушает политики модерации контента.',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const denyList = nodeData.inputs?.denyList as string
        const model = nodeData.inputs?.model as BaseChatModel
        const moderationErrorMessage = nodeData.inputs?.moderationErrorMessage as string

        return new SimplePromptModerationRunner(denyList, moderationErrorMessage, model)
    }
}

module.exports = { nodeClass: SimplePromptModeration }
