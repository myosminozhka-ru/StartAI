import {
    OSMIWindowMemory,
    ICommonObject,
    IDatabaseEntity,
    IMessage,
    INode,
    INodeData,
    INodeParams,
    MemoryMethods
} from '../../../src/Interface'
import { getBaseClasses, mapChatMessageToBaseMessage } from '../../../src/utils'
import { BufferWindowMemory, BufferWindowMemoryInput } from 'langchain/memory'
import { BaseMessage } from '@langchain/core/messages'
import { DataSource } from 'typeorm'

class BufferWindowMemory_Memory implements INode {
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
        this.label = 'Буферная память с окном'
        this.name = 'bufferWindowMemory'
        this.version = 2.0
        this.type = 'BufferWindowMemory'
        this.icon = 'memory.svg'
        this.category = 'Memory'
        this.description = 'Использует окно размера k для отображения последних k обменов сообщениями для использования в качестве памяти'
        this.baseClasses = [this.type, ...getBaseClasses(BufferWindowMemory)]
        this.inputs = [
            {
                label: 'Размер',
                name: 'k',
                type: 'number',
                default: '4',
                description: 'Окно размера k для отображения последних k обменов сообщениями для использования в качестве памяти.'
            },
            {
                label: 'ID сессии',
                name: 'sessionId',
                type: 'string',
                description:
                    'Если не указан, будет использован случайный id. Узнайте <a target="_blank" href="https://docs.OSMIai.com/memory#ui-and-embedded-chat">больше</a>',
                default: '',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Ключ памяти',
                name: 'memoryKey',
                type: 'string',
                default: 'chat_history',
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const k = nodeData.inputs?.k as string
        const sessionId = nodeData.inputs?.sessionId as string
        const memoryKey = (nodeData.inputs?.memoryKey as string) ?? 'chat_history'

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string
        const orgId = options.orgId as string

        const obj: Partial<BufferWindowMemoryInput> & BufferMemoryExtendedInput = {
            returnMessages: true,
            sessionId,
            memoryKey,
            k: parseInt(k, 10),
            appDataSource,
            databaseEntities,
            chatflowid,
            orgId
        }

        return new BufferWindowMemoryExtended(obj)
    }
}

interface BufferMemoryExtendedInput {
    sessionId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string
}

class BufferWindowMemoryExtended extends OSMIWindowMemory implements MemoryMethods {
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    chatflowid: string
    orgId: string
    sessionId = ''

    constructor(fields: BufferWindowMemoryInput & BufferMemoryExtendedInput) {
        super(fields)
        this.sessionId = fields.sessionId
        this.appDataSource = fields.appDataSource
        this.databaseEntities = fields.databaseEntities
        this.chatflowid = fields.chatflowid
        this.orgId = fields.orgId
    }

    async getChatMessages(
        overrideSessionId = '',
        returnBaseMessages = false,
        prependMessages?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]> {
        const id = overrideSessionId ? overrideSessionId : this.sessionId
        if (!id) return []

        let chatMessage = await this.appDataSource.getRepository(this.databaseEntities['ChatMessage']).find({
            where: {
                sessionId: id,
                chatflowid: this.chatflowid
            },
            order: {
                createdDate: 'ASC'
            }
        })

        if (this.k <= 0) {
            chatMessage = []
        } else {
            chatMessage = chatMessage.slice(-this.k * 2)
        }

        if (prependMessages?.length) {
            chatMessage.unshift(...prependMessages)
        }

        if (returnBaseMessages) {
            return await mapChatMessageToBaseMessage(chatMessage, this.orgId)
        }

        let returnIMessages: IMessage[] = []
        for (const m of chatMessage) {
            returnIMessages.push({
                message: m.content as string,
                type: m.role
            })
        }
        return returnIMessages
    }

    async addChatMessages(): Promise<void> {
        // adding chat messages is done on server level
        return
    }

    async clearChatMessages(): Promise<void> {
        // clearing chat messages is done on server level
        return
    }
}

module.exports = { nodeClass: BufferWindowMemory_Memory }
