import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { VectorStore } from '@langchain/core/vectorstores'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { BabyAGI } from './core'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class BabyAGI_Agents implements INode {
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
        this.label = 'BabyAGI'
        this.name = 'babyAGI'
        this.version = 2.0
        this.type = 'BabyAGI'
        this.category = 'Agents'
        this.icon = 'babyagi.svg'
        this.description =
            'Автономный агент, управляемый задачами, который создает новые задачи и переприоритизирует список задач на основе цели'
        this.baseClasses = ['BabyAGI']
        this.inputs = [
            {
                label: 'Модель чата',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Векторное хранилище',
                name: 'vectorStore',
                type: 'VectorStore'
            },
            {
                label: 'Цикл задач',
                name: 'taskLoop',
                type: 'number',
                default: 3
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаруживает текст, который может привести к созданию вредоносного вывода, и предотвращает его отправку в языковую модель',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const vectorStore = nodeData.inputs?.vectorStore as VectorStore
        const taskLoop = nodeData.inputs?.taskLoop as string
        const k = (vectorStore as any)?.k ?? 4

        const babyAgi = BabyAGI.fromLLM(model, vectorStore, parseInt(taskLoop, 10), k)
        return babyAgi
    }

    async run(nodeData: INodeData, input: string): Promise<string | object> {
        const executor = nodeData.instance as BabyAGI
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Использовать результат цепочки модерации в качестве входных данных для агента BabyAGI
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                // if (options.shouldStreamResponse) {
                //     streamResponse(options.sseStreamer, options.chatId, e.message)
                // }
                return formatResponse(e.message)
            }
        }

        const objective = input

        const res = await executor.call({ objective })
        return res
    }
}

module.exports = { nodeClass: BabyAGI_Agents }
