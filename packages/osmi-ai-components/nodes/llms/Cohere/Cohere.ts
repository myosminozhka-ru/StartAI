import { BaseCache } from '@langchain/core/caches'
import { Cohere, CohereInput } from '@langchain/cohere'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'

class Cohere_LLMs implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cohere'
        this.name = 'cohere'
        this.version = 3.0
        this.type = 'Cohere'
        this.icon = 'Cohere.svg'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг больших языковых моделей Cohere'
        this.baseClasses = [this.type, ...getBaseClasses(Cohere)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cohereApi']
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'command'
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.7,
                optional: true
            },
            {
                label: 'Максимальное количество токенов',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'cohere')
        }
    }
    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const cache = nodeData.inputs?.cache as BaseCache
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)

        const obj: CohereInput = {
            apiKey: cohereApiKey
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (modelName) obj.model = modelName
        if (temperature) obj.temperature = parseFloat(temperature)
        if (cache) obj.cache = cache
        const model = new Cohere(obj)
        return model
    }
}

module.exports = { nodeClass: Cohere_LLMs }
