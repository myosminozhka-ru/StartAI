import { flatten } from 'lodash'
import { AgentExecutor } from 'langchain/agents'
import { pull } from 'langchain/hub'
import { Tool } from '@langchain/core/tools'
import type { PromptTemplate } from '@langchain/core/prompts'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { additionalCallbacks } from '../../../src/handler'
import { getBaseClasses } from '../../../src/utils'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { createReactAgent } from '../../../src/agents'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

class ReActAgentLLM_Agents implements INode {
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
        this.label = 'ReAct Agent для языковых моделей'
        this.name = 'reactAgentLLM'
        this.version = 2.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'agent.svg'
        this.description =
            'Агент, использующий логику ReAct для принятия решений о действиях, оптимизированный для использования с языковыми моделями'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'Разрешенные инструменты',
                name: 'tools',
                type: 'Tool',
                list: true
            },
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки в языковую модель',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'Максимальное количество итераций',
                name: 'maxIterations',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const model = nodeData.inputs?.model as BaseLanguageModel
        const maxIterations = nodeData.inputs?.maxIterations as string
        let tools = nodeData.inputs?.tools as Tool[]
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        if (moderations && moderations.length > 0) {
            try {
                // Использовать выходные данные цепочки модерации как входные данные для ReAct Agent для языковых моделей
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                // if (options.shouldStreamResponse) {
                //     streamResponse(options.sseStreamer, options.chatId, e.message)
                // }
                return formatResponse(e.message)
            }
        }

        tools = flatten(tools)

        const prompt = await pull<PromptTemplate>('hwchase17/react')

        const agent = await createReactAgent({
            llm: model,
            tools,
            prompt
        })

        const executor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.DEBUG === 'true',
            maxIterations: maxIterations ? parseFloat(maxIterations) : undefined
        })

        const callbacks = await additionalCallbacks(nodeData, options)

        const result = await executor.invoke({ input }, { callbacks })

        return result?.output
    }
}

module.exports = { nodeClass: ReActAgentLLM_Agents }
