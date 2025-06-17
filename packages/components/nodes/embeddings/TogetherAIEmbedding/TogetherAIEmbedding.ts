import { TogetherAIEmbeddings, TogetherAIEmbeddingsParams } from '@langchain/community/embeddings/togetherai'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class TogetherAIEmbedding_Embeddings implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'TogetherAIEmbedding'
        this.name = 'togetherAIEmbedding'
        this.version = 1.0
        this.type = 'TogetherAIEmbedding'
        this.icon = 'togetherai.png'
        this.category = 'Embeddings'
        this.description = 'Модели эмбеддингов TogetherAI для генерации эмбеддингов для заданного текста'
        this.baseClasses = [this.type, ...getBaseClasses(TogetherAIEmbeddings)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['togetherAIApi']
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
                type: 'string',
                placeholder: 'sentence-transformers/msmarco-bert-base-dot-v5',
                description: 'См. страницу <a target="_blank" href="https://docs.together.ai/docs/embedding-models">моделей эмбеддингов</a>'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const togetherAIApiKey = getCredentialParam('togetherAIApiKey', credentialData, nodeData)

        const obj: Partial<TogetherAIEmbeddingsParams> = {
            modelName: modelName,
            apiKey: togetherAIApiKey,
            model: modelName
        }

        const model = new TogetherAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: TogetherAIEmbedding_Embeddings }
