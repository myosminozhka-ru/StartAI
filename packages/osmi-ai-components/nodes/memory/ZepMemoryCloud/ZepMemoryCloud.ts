import { ZepMemory, ZepMemoryInput } from '@getzep/zep-cloud/langchain'
import { BaseMessage } from '@langchain/core/messages'
import { InputValues, MemoryVariables, OutputValues } from 'langchain/memory'
import { ICommonObject } from '../../../src'
import { IMessage, INode, INodeData, INodeParams, MemoryMethods, MessageType } from '../../../src/Interface'
import {
    convertBaseMessagetoIMessage,
    getBaseClasses,
    getCredentialData,
    getCredentialParam,
    mapChatMessageToBaseMessage
} from '../../../src/utils'

class ZepMemoryCloud_Memory implements INode {
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
        this.label = 'Zep Память - Облако'
        this.name = 'ZepMemoryCloud'
        this.version = 2.0
        this.type = 'ZepMemory'
        this.icon = 'zep.svg'
        this.category = 'Memory'
        this.description = 'Резюмирует разговор и сохраняет память в zep сервере'
        this.baseClasses = [this.type, ...getBaseClasses(ZepMemory)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            optional: true,
            description: 'Настройте JWT аутентификацию на вашем экземпляре Zep (Необязательно)',
            credentialNames: ['zepMemoryApi']
        }
        this.inputs = [
            {
                label: 'ID сессии',
                name: 'sessionId',
                type: 'string',
                description:
                    'Если не указан, будет использован случайный id. Узнайте <a target="_blank" href="https://docs.OSMIai.com/memory/long-term-memory#ui-and-embedded-chat">больше</a>',
                default: '',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Тип памяти',
                name: 'memoryType',
                type: 'string',
                default: 'perpetual',
                description: 'Тип памяти Zep, может быть perpetual или message_window',
                additionalParams: true
            },
            {
                label: 'AI префикс',
                name: 'aiPrefix',
                type: 'string',
                default: 'ai',
                additionalParams: true
            },
            {
                label: 'Человеческий префикс',
                name: 'humanPrefix',
                type: 'string',
                default: 'human',
                additionalParams: true
            },
            {
                label: 'Ключ памяти',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            },
            {
                label: 'Ключ ввода',
                name: 'inputKey',
                type: 'string',
                default: 'input',
                additionalParams: true
            },
            {
                label: 'Ключ вывода',
                name: 'outputKey',
                type: 'string',
                default: 'text',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        return await initializeZep(nodeData, options)
    }
}

const initializeZep = async (nodeData: INodeData, options: ICommonObject): Promise<ZepMemory> => {
    const aiPrefix = nodeData.inputs?.aiPrefix as string
    const humanPrefix = nodeData.inputs?.humanPrefix as string
    const memoryKey = nodeData.inputs?.memoryKey as string
    const inputKey = nodeData.inputs?.inputKey as string

    const memoryType = nodeData.inputs?.memoryType as 'perpetual' | 'message_window'
    const sessionId = nodeData.inputs?.sessionId as string

    const credentialData = await getCredentialData(nodeData.credential ?? '', options)
    const apiKey = getCredentialParam('apiKey', credentialData, nodeData)
    const orgId = options.orgId as string
    const obj: ZepMemoryInput & ZepMemoryExtendedInput = {
        apiKey,
        aiPrefix,
        humanPrefix,
        memoryKey,
        sessionId,
        inputKey,
        memoryType: memoryType,
        returnMessages: true,
        orgId
    }

    return new ZepMemoryExtended(obj)
}

interface ZepMemoryExtendedInput {
    memoryType?: 'perpetual' | 'message_window'
    orgId: string
}

class ZepMemoryExtended extends ZepMemory implements MemoryMethods {
    memoryType: 'perpetual' | 'message_window'
    orgId: string

    constructor(fields: ZepMemoryInput & ZepMemoryExtendedInput) {
        super(fields)
        this.memoryType = fields.memoryType ?? 'perpetual'
        this.orgId = fields.orgId
    }

    async loadMemoryVariables(values: InputValues, overrideSessionId = ''): Promise<MemoryVariables> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.loadMemoryVariables({ ...values, memoryType: this.memoryType })
    }

    async saveContext(inputValues: InputValues, outputValues: OutputValues, overrideSessionId = ''): Promise<void> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.saveContext(inputValues, outputValues)
    }

    async clear(overrideSessionId = ''): Promise<void> {
        if (overrideSessionId) {
            this.sessionId = overrideSessionId
        }
        return super.clear()
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const memoryVariables = await this.loadMemoryVariables({}, id)
        const baseMessages = memoryVariables[this.memoryKey]
        if (prependMessages?.length) {
            baseMessages.unshift(...(await mapChatMessageToBaseMessage(prependMessages, this.orgId)))
        }
        return returnBaseMessages ? baseMessages : convertBaseMessagetoIMessage(baseMessages)
    }

    async addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        const input = msgArray.find((msg) => msg.type === 'userMessage')
        const output = msgArray.find((msg) => msg.type === 'apiMessage')
        const inputValues = { [this.inputKey ?? 'input']: input?.text }
        const outputValues = { output: output?.text }

        await this.saveContext(inputValues, outputValues, id)
    }

    async clearChatMessages(overrideSessionId = ''): Promise<void> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        await this.clear(id)
    }
}

module.exports = { nodeClass: ZepMemoryCloud_Memory }
