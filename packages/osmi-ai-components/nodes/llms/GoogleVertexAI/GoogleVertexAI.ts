import { BaseCache } from '@langchain/core/caches'
import { VertexAI, VertexAIInput } from '@langchain/google-vertexai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { getModels, MODEL_TYPE } from '../../../src/modelLoader'
import { buildGoogleCredentials } from '../../../src/google-utils'

class GoogleVertexAI_LLMs implements INode {
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
        this.label = 'GoogleVertexAI'
        this.name = 'googlevertexai'
        this.version = 3.0
        this.type = 'GoogleVertexAI'
        this.icon = 'GoogleVertex.svg'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг больших языковых моделей GoogleVertexAI'
        this.baseClasses = [this.type, ...getBaseClasses(VertexAI)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth'],
            optional: true,
            description:
                'Учетные данные Google Vertex AI. Если вы используете сервис GCP, такой как Cloud Run, или если у вас установлены учетные данные по умолчанию на локальной машине, вам не нужно устанавливать эти учетные данные.'
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
                default: 'text-bison'
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
                label: 'Максимальное количество выходных токенов',
                name: 'maxOutputTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Верхняя вероятность',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'googlevertexai')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens as string
        const topP = nodeData.inputs?.topP as string
        const cache = nodeData.inputs?.cache as BaseCache

        const obj: Partial<VertexAIInput> = {
            temperature: parseFloat(temperature),
            model: modelName
        }

        const authOptions = await buildGoogleCredentials(nodeData, options)
        if (authOptions && Object.keys(authOptions).length !== 0) obj.authOptions = authOptions

        if (maxOutputTokens) obj.maxOutputTokens = parseInt(maxOutputTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (cache) obj.cache = cache

        const model = new VertexAI(obj)
        return model
    }
}

module.exports = { nodeClass: GoogleVertexAI_LLMs }
