import { CohereEmbeddings, CohereEmbeddingsParams } from '@langchain/cohere'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

class CohereEmbedding_Embeddings implements INode {
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
        this.label = 'Cohere Embeddings'
        this.name = 'cohereEmbeddings'
        this.version = 3.0
        this.type = 'CohereEmbeddings'
        this.icon = 'Cohere.svg'
        this.category = 'Embeddings'
        this.description = 'Cohere API для генерации эмбеддингов для заданного текста'
        this.baseClasses = [this.type, ...getBaseClasses(CohereEmbeddings)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['cohereApi']
        }
        this.inputs = [
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'embed-english-v2.0'
            },
            {
                label: 'Тип',
                name: 'inputType',
                type: 'options',
                description:
                    'Указывает тип ввода, передаваемого в модель. Требуется для моделей эмбеддингов v3 и выше. <a target="_blank" href="https://docs.cohere.com/reference/embed">Официальная документация</a>',
                options: [
                    {
                        label: 'search_document',
                        name: 'search_document',
                        description:
                            'Используйте это для кодирования документов для эмбеддингов, которые вы храните в векторной базе данных для случаев поиска'
                    },
                    {
                        label: 'search_query',
                        name: 'search_query',
                        description: 'Используйте это, когда вы запрашиваете вашу векторную БД для поиска соответствующих документов.'
                    },
                    {
                        label: 'classification',
                        name: 'classification',
                        description: 'Используйте это, когда вы используете эмбеддинги как вход для текстового классификатора'
                    },
                    {
                        label: 'clustering',
                        name: 'clustering',
                        description: 'Используйте это, когда вы хотите кластеризовать эмбеддинги.'
                    }
                ],
                default: 'search_query',
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'cohereEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const inputType = nodeData.inputs?.inputType as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const cohereApiKey = getCredentialParam('cohereApiKey', credentialData, nodeData)

        const obj: Partial<CohereEmbeddingsParams> & { apiKey?: string } = {
            apiKey: cohereApiKey
        }

        if (modelName) obj.model = modelName
        if (inputType) obj.inputType = inputType

        const model = new CohereEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: CohereEmbedding_Embeddings }
