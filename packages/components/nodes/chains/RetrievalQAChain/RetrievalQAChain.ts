import { BaseRetriever } from '@langchain/core/retrievers'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { RetrievalQAChain } from 'langchain/chains'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class RetrievalQAChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Цепочка поиска вопросов-ответов'
        this.name = 'retrievalQAChain'
        this.version = 2.0
        this.type = 'RetrievalQAChain'
        this.icon = 'qa.svg'
        this.category = 'Chains'
        this.description = 'Цепочка вопросов-ответов для ответа на вопрос на основе найденных документов'
        this.baseClasses = [this.type, ...getBaseClasses(RetrievalQAChain)]
        this.inputs = [
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Векторное хранилище поиска',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки языковой модели',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as BaseRetriever

        const chain = RetrievalQAChain.fromLLM(model, vectorStoreRetriever, { verbose: process.env.DEBUG === 'true' })
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const chain = nodeData.instance as RetrievalQAChain
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the Retrieval QA Chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }
        const obj = {
            query: input
        }
        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId)
            const res = await chain.call(obj, [loggerHandler, handler, ...callbacks])
            return res?.text
        } else {
            const res = await chain.call(obj, [loggerHandler, ...callbacks])
            return res?.text
        }
    }
}

module.exports = { nodeClass: RetrievalQAChain_Chains }
