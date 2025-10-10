import { ICommonObject, INode, INodeData, INodeParams, INodeOutputsValue, IServerSideEventStreamer } from '../../../src/Interface'
import { FromLLMInput, GraphCypherQAChain } from '@langchain/community/chains/graph_qa/cypher'
import { getBaseClasses } from '../../../src/utils'
import { BasePromptTemplate, PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ConsoleCallbackHandler as LCConsoleCallbackHandler } from '@langchain/core/tracers/console'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class GraphCypherQA_Chain implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    sessionId?: string
    outputs: INodeOutputsValue[]

    constructor(fields?: { sessionId?: string }) {
        this.label = 'Цепочка вопросов-ответов Graph Cypher'
        this.name = 'graphCypherQAChain'
        this.version = 1.1
        this.type = 'GraphCypherQAChain'
        this.icon = 'graphqa.svg'
        this.category = 'Chains'
        this.description = 'Продвинутая цепочка для вопросов-ответов по графу Neo4j путем генерации Cypher-запросов'
        this.baseClasses = [this.type, ...getBaseClasses(GraphCypherQAChain)]
        this.sessionId = fields?.sessionId
        this.inputs = [
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel',
                description: 'Модель для генерации Cypher-запросов и ответов.'
            },
            {
                label: 'Граф Neo4j',
                name: 'graph',
                type: 'Neo4j'
            },
            {
                label: 'Промпт генерации Cypher',
                name: 'cypherPrompt',
                optional: true,
                type: 'BasePromptTemplate',
                description:
                    'Шаблон промпта для генерации Cypher-запросов. Должен включать переменные {schema} и {question}. Если не указан, будет использован промпт по умолчанию.'
            },
            {
                label: 'Модель генерации Cypher',
                name: 'cypherModel',
                optional: true,
                type: 'BaseLanguageModel',
                description: 'Модель для генерации Cypher-запросов. Если не указана, будет использована основная модель.'
            },
            {
                label: 'Промпт вопросов-ответов',
                name: 'qaPrompt',
                optional: true,
                type: 'BasePromptTemplate',
                description:
                    'Шаблон промпта для генерации ответов. Должен включать переменные {context} и {question}. Если не указан, будет использован промпт по умолчанию.'
            },
            {
                label: 'Модель вопросов-ответов',
                name: 'qaModel',
                optional: true,
                type: 'BaseLanguageModel',
                description: 'Модель для генерации ответов. Если не указана, будет использована основная модель.'
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки языковой модели',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'Возвращать напрямую',
                name: 'returnDirect',
                type: 'boolean',
                default: false,
                optional: true,
                description: 'Если true, возвращает необработанные результаты запроса вместо использования цепочки вопросов-ответов'
            }
        ]
        this.outputs = [
            {
                label: 'Цепочка вопросов-ответов Graph Cypher',
                name: 'graphCypherQAChain',
                baseClasses: [this.type, ...getBaseClasses(GraphCypherQAChain)]
            },
            {
                label: 'Предсказание вывода',
                name: 'outputPrediction',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const model = nodeData.inputs?.model
        const cypherModel = nodeData.inputs?.cypherModel
        const qaModel = nodeData.inputs?.qaModel
        const graph = nodeData.inputs?.graph
        const cypherPrompt = nodeData.inputs?.cypherPrompt as BasePromptTemplate | FewShotPromptTemplate | undefined
        const qaPrompt = nodeData.inputs?.qaPrompt as BasePromptTemplate | undefined
        const returnDirect = nodeData.inputs?.returnDirect as boolean
        const output = nodeData.outputs?.output as string

        if (!model) {
            throw new Error('Требуется языковая модель')
        }

        // Handle prompt values if they exist
        let cypherPromptTemplate: PromptTemplate | FewShotPromptTemplate | undefined
        let qaPromptTemplate: PromptTemplate | undefined

        if (cypherPrompt) {
            if (cypherPrompt instanceof PromptTemplate) {
                cypherPromptTemplate = new PromptTemplate({
                    template: cypherPrompt.template as string,
                    inputVariables: cypherPrompt.inputVariables
                })
                if (!qaPrompt) {
                    throw new Error('Требуется промпт вопросов-ответов, когда промпт Cypher является шаблоном промпта')
                }
            } else if (cypherPrompt instanceof FewShotPromptTemplate) {
                const examplePrompt = cypherPrompt.examplePrompt as PromptTemplate
                cypherPromptTemplate = new FewShotPromptTemplate({
                    examples: cypherPrompt.examples,
                    examplePrompt: examplePrompt,
                    inputVariables: cypherPrompt.inputVariables,
                    prefix: cypherPrompt.prefix,
                    suffix: cypherPrompt.suffix,
                    exampleSeparator: cypherPrompt.exampleSeparator,
                    templateFormat: cypherPrompt.templateFormat
                })
            } else {
                cypherPromptTemplate = cypherPrompt as PromptTemplate
            }
        }

        if (qaPrompt instanceof PromptTemplate) {
            qaPromptTemplate = new PromptTemplate({
                template: qaPrompt.template as string,
                inputVariables: qaPrompt.inputVariables
            })
        }

        // Validate required variables in prompts
        if (
            cypherPromptTemplate &&
            (!cypherPromptTemplate?.inputVariables.includes('schema') || !cypherPromptTemplate?.inputVariables.includes('question'))
        ) {
            throw new Error('Промпт генерации Cypher должен включать переменные {schema} и {question}')
        }

        const fromLLMInput: FromLLMInput = {
            llm: model,
            graph,
            returnDirect
        }

        if (cypherPromptTemplate) {
            fromLLMInput['cypherLLM'] = cypherModel ?? model
            fromLLMInput['cypherPrompt'] = cypherPromptTemplate
        }

        if (qaPromptTemplate) {
            fromLLMInput['qaLLM'] = qaModel ?? model
            fromLLMInput['qaPrompt'] = qaPromptTemplate
        }

        const chain = GraphCypherQAChain.fromLLM(fromLLMInput)

        if (output === this.name) {
            return chain
        } else if (output === 'outputPrediction') {
            nodeData.instance = chain
            return await this.run(nodeData, input, options)
        }

        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const chain = nodeData.instance as GraphCypherQAChain
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        const returnDirect = nodeData.inputs?.returnDirect as boolean

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        // Handle input moderation if configured
        if (moderations && moderations.length > 0) {
            try {
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
        const callbackHandlers = await additionalCallbacks(nodeData, options)
        let callbacks = [loggerHandler, ...callbackHandlers]

        if (process.env.DEBUG === 'true') {
            callbacks.push(new LCConsoleCallbackHandler())
        }

        try {
            let response
            if (shouldStreamResponse) {
                if (returnDirect) {
                    response = await chain.invoke(obj, { callbacks })
                    let result = response?.result
                    if (typeof result === 'object') {
                        result = '```json\n' + JSON.stringify(result, null, 2)
                    }
                    if (result && typeof result === 'string') {
                        streamResponse(sseStreamer, chatId, result)
                    }
                } else {
                    const handler = new CustomChainHandler(sseStreamer, chatId, 2)
                    callbacks.push(handler)
                    response = await chain.invoke(obj, { callbacks })
                }
            } else {
                response = await chain.invoke(obj, { callbacks })
            }

            return formatResponse(response?.result)
        } catch (error) {
            console.error('Ошибка в GraphCypherQAChain:', error)
            if (shouldStreamResponse) {
                streamResponse(sseStreamer, chatId, error.message)
            }
            return formatResponse(`Ошибка: ${error.message}`)
        }
    }
}

module.exports = { nodeClass: GraphCypherQA_Chain }
