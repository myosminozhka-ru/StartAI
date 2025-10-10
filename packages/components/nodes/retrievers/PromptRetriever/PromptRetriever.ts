import { transformBracesWithColon } from '../../../src'
import { INode, INodeData, INodeParams, PromptRetriever, PromptRetrieverInput } from '../../../src/Interface'

class PromptRetriever_Retrievers implements INode {
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
        this.label = 'Промпт ретривер'
        this.name = 'promptRetriever'
        this.version = 1.0
        this.type = 'PromptRetriever'
        this.icon = 'promptretriever.svg'
        this.category = 'Retrievers'
        this.description = 'Сохранить шаблон промпта с именем и описанием для последующего запроса MultiPromptChain'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Название промпта',
                name: 'name',
                type: 'string',
                placeholder: 'physics-qa'
            },
            {
                label: 'Описание промпта',
                name: 'description',
                type: 'string',
                rows: 3,
                description: 'Описание того, что делает промпт и когда его следует использовать',
                placeholder: 'Good for answering questions about physics'
            },
            {
                label: 'Системное сообщение промпта',
                name: 'systemMessage',
                type: 'string',
                rows: 4,
                placeholder: `You are a very smart physics professor. You are great at answering questions about physics in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.`
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const name = nodeData.inputs?.name as string
        const description = nodeData.inputs?.description as string
        let systemMessage = nodeData.inputs?.systemMessage as string
        systemMessage = transformBracesWithColon(systemMessage)

        const obj = {
            name,
            description,
            systemMessage
        } as PromptRetrieverInput

        const retriever = new PromptRetriever(obj)
        return retriever
    }
}

module.exports = { nodeClass: PromptRetriever_Retrievers }
