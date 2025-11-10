import { VertexAIEmbeddings, GoogleVertexAIEmbeddingsInput } from '@langchain/google-vertexai'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { MODEL_TYPE, getModels } from '../../../src/modelLoader'

class GoogleVertexAIEmbedding_Embeddings implements INode {
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
        this.label = 'GoogleVertexAI Embeddings'
        this.name = 'googlevertexaiEmbeddings'
        this.version = 2.0
        this.type = 'GoogleVertexAIEmbeddings'
        this.icon = 'GoogleVertex.svg'
        this.category = 'Embeddings'
        this.description = 'Google vertexAI API для генерации эмбеддингов для заданного текста'
        this.baseClasses = [this.type, ...getBaseClasses(VertexAIEmbeddings)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleVertexAuth'],
            optional: true,
            description:
                'Google Vertex AI учетные данные. Если вы используете GCP сервис, такой как Cloud Run, или если у вас установлены учетные данные по умолчанию на локальной машине, вам не нужно устанавливать эти учетные данные.'
        }
        this.inputs = [
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'textembedding-gecko@001'
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.EMBEDDING, 'googlevertexaiEmbeddings')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const modelName = nodeData.inputs?.modelName as string
        const googleApplicationCredentialFilePath = getCredentialParam('googleApplicationCredentialFilePath', credentialData, nodeData)
        const googleApplicationCredential = getCredentialParam('googleApplicationCredential', credentialData, nodeData)
        const projectID = getCredentialParam('projectID', credentialData, nodeData)

        const authOptions: any = {}
        if (Object.keys(credentialData).length !== 0) {
            if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
                throw new Error('Please specify your Google Application Credential')
            if (!googleApplicationCredentialFilePath && !googleApplicationCredential)
                throw new Error(
                    'Error: More than one component has been inputted. Please use only one of the following: Google Application Credential File Path or Google Credential JSON Object'
                )

            if (googleApplicationCredentialFilePath && !googleApplicationCredential)
                authOptions.keyFile = googleApplicationCredentialFilePath
            else if (!googleApplicationCredentialFilePath && googleApplicationCredential)
                authOptions.credentials = JSON.parse(googleApplicationCredential)

            if (projectID) authOptions.projectId = projectID
        }
        const obj: GoogleVertexAIEmbeddingsInput = {
            model: modelName
        }
        if (Object.keys(authOptions).length !== 0) obj.authOptions = authOptions

        const model = new VertexAIEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: GoogleVertexAIEmbedding_Embeddings }
