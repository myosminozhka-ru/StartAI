import { flatten } from 'lodash'
import { Tool, StructuredTool } from '@langchain/core/tools'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { VectorStoreRetriever } from '@langchain/core/vectorstores'
import { PromptTemplate } from '@langchain/core/prompts'
import { AutoGPT } from 'langchain/experimental/autogpt'
import { LLMChain } from 'langchain/chains'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

type ObjectTool = StructuredTool
const FINISH_NAME = 'finish'

class AutoGPT_Agents implements INode {
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
        this.label = 'AutoGPT'
        this.name = 'autoGPT'
        this.version = 2.0
        this.type = 'AutoGPT'
        this.category = 'Agents'
        this.icon = 'autogpt.svg'
        this.description = 'Автономный агент с цепочкой мыслей для самостоятельного выполнения задач'
        this.baseClasses = ['AutoGPT']
        this.inputs = [
            {
                label: 'Разрешённые инструменты',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Модель чата',
                name: 'model',
                type: 'BaseChatModel'
            },
            {
                label: 'Векторный поисковик',
                name: 'vectorStoreRetriever',
                type: 'BaseRetriever'
            },
            {
                label: 'Имя AutoGPT',
                name: 'aiName',
                type: 'string',
                placeholder: 'Tom',
                optional: true
            },
            {
                label: 'Роль AutoGPT',
                name: 'aiRole',
                type: 'string',
                placeholder: 'Assistant',
                optional: true
            },
            {
                label: 'Максимальное количество циклов',
                name: 'maxLoop',
                type: 'number',
                default: 5,
                optional: true
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаруживать текст, который может привести к вредоносному выводу, и предотвращать его отправку языковой модели',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const model = nodeData.inputs?.model as BaseChatModel
        const vectorStoreRetriever = nodeData.inputs?.vectorStoreRetriever as VectorStoreRetriever
        let tools = nodeData.inputs?.tools as Tool[]
        tools = flatten(tools)
        const aiName = (nodeData.inputs?.aiName as string) || 'AutoGPT'
        const aiRole = (nodeData.inputs?.aiRole as string) || 'Assistant'
        const maxLoop = nodeData.inputs?.maxLoop as string

        const autogpt = AutoGPT.fromLLMAndTools(model, tools, {
            memory: vectorStoreRetriever,
            aiName,
            aiRole
        })

        autogpt.maxIterations = parseInt(maxLoop, 10)

        return autogpt
    }

    async run(nodeData: INodeData, input: string): Promise<string | object> {
        const executor = nodeData.instance as AutoGPT
        const model = nodeData.inputs?.model as BaseChatModel
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Использовать результат цепочки модерации как ввод для агента AutoGPT
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                // if (options.shouldStreamResponse) {
                //     streamResponse(options.sseStreamer, options.chatId, e.message)
                // }
                return formatResponse(e.message)
            }
        }

        try {
            let totalAssistantReply = ''
            executor.run = async (goals: string[]): Promise<string | undefined> => {
                const user_input = 'Определите, какую следующую команду использовать, и ответьте, используя указанный выше формат:'
                let loopCount = 0
                while (loopCount < executor.maxIterations) {
                    loopCount += 1

                    const { text: assistantReply } = await executor.chain.call({
                        goals,
                        user_input,
                        memory: executor.memory,
                        messages: executor.fullMessageHistory
                    })

                    // eslint-disable-next-line no-console
                    console.log('\x1b[92m\x1b[1m\n*****AutoGPT*****\n\x1b[0m\x1b[0m')
                    // eslint-disable-next-line no-console
                    console.log(assistantReply)
                    totalAssistantReply += assistantReply + '\n'
                    executor.fullMessageHistory.push(new HumanMessage(user_input))
                    executor.fullMessageHistory.push(new AIMessage(assistantReply))

                    const action = await executor.outputParser.parse(assistantReply)
                    const tools = executor.tools.reduce((acc, tool) => ({ ...acc, [tool.name]: tool }), {} as Record<string, any>)
                    if (action.name === FINISH_NAME) {
                        return action.args.response
                    }
                    let result: string
                    if (action.name in tools) {
                        const tool = tools[action.name]
                        let observation
                        try {
                            observation = await tool.call(action.args)
                        } catch (e) {
                            observation = `Ошибка в аргументах: ${e}`
                        }
                        result = `Команда ${tool.name} вернула: ${observation}`
                    } else if (action.name === 'ERROR') {
                        result = `Ошибка: ${action.args}. `
                    } else {
                        result = `Неизвестная команда '${action.name}'. Пожалуйста, обратитесь к списку 'COMMANDS' для доступных команд и отвечайте только в указанном формате JSON.`
                    }

                    let memoryToAdd = `Ответ ассистента: ${assistantReply}\nРезультат: ${result} `
                    if (executor.feedbackTool) {
                        const feedback = `\n${await executor.feedbackTool.call('Input: ')}`
                        if (feedback === 'q' || feedback === 'stop') {
                            return 'ВЫХОД'
                        }
                        memoryToAdd += feedback
                    }

                    const documents = await executor.textSplitter.createDocuments([memoryToAdd])
                    await executor.memory.addDocuments(documents)
                    executor.fullMessageHistory.push(new SystemMessage(result))
                }

                return undefined
            }

            const res = await executor.run([input])

            if (!res) {
                const sentence = `К сожалению, мне не удалось выполнить все задачи. Вот цепочка мыслей:`
                return `${await rephraseString(sentence, model)}\n\`\`\`javascript\n${totalAssistantReply}\n\`\`\`\n`
            }

            const sentence = `Я выполнил все свои задачи. Вот цепочка мыслей:`
            let writeFilePath = ''
            const writeTool = executor.tools.find((tool) => tool.name === 'write_file')
            if (executor.tools.length && writeTool) {
                writeFilePath = (writeTool as any).store.basePath
            }
            return `${await rephraseString(
                sentence,
                model
            )}\n\`\`\`javascript\n${totalAssistantReply}\n\`\`\`\nИ финальный результат:\n\`\`\`javascript\n${res}\n\`\`\`\n${
                writeFilePath
                    ? await rephraseString(
                          `Вы можете скачать финальный результат, отображённый выше, или проверить, был ли успешно записан новый файл по пути \`${writeFilePath}\``,
                          model
                      )
                    : ''
            }`
        } catch (e) {
            throw new Error(e)
        }
    }
}

const rephraseString = async (sentence: string, model: BaseChatModel) => {
    const promptTemplate = new PromptTemplate({
        template: 'Вы — полезный ассистент, который перефразирует предложение: {sentence}',
        inputVariables: ['sentence']
    })
    const chain = new LLMChain({ llm: model, prompt: promptTemplate })
    const res = await chain.call({ sentence })
    return res?.text
}

module.exports = { nodeClass: AutoGPT_Agents }
