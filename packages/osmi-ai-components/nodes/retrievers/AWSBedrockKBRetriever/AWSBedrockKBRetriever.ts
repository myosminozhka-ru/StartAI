import { AmazonKnowledgeBaseRetriever } from '@langchain/aws'
import { ICommonObject, INode, INodeData, INodeParams, INodeOptionsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { RetrievalFilter } from '@aws-sdk/client-bedrock-agent-runtime'
import { MODEL_TYPE, getRegions } from '../../../src/modelLoader'

class AWSBedrockKBRetriever_Retrievers implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS Bedrock Ретривер базы знаний'
        this.name = 'awsBedrockKBRetriever'
        this.version = 1.0
        this.type = 'AWSBedrockKBRetriever'
        this.icon = 'AWSBedrockKBRetriever.svg'
        this.category = 'Retrievers'
        this.description = 'Подключиться к AWS Bedrock Knowledge Base API и извлечь соответствующие фрагменты'
        this.baseClasses = [this.type, 'BaseRetriever']
        this.credential = {
            label: 'AWS Учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Регион',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
            },
            {
                label: 'ID базы знаний',
                name: 'knoledgeBaseID',
                type: 'string'
            },
            {
                label: 'Запрос',
                name: 'query',
                type: 'string',
                description: 'Запрос для извлечения документов из ретривера. Если не указан, будет использован вопрос пользователя',
                optional: true,
                acceptVariable: true
            },
            {
                label: 'TopK',
                name: 'topK',
                type: 'number',
                description: 'Количество фрагментов для извлечения',
                optional: true,
                additionalParams: true,
                default: 5
            },
            {
                label: 'Тип поиска',
                name: 'searchType',
                type: 'options',
                description:
                    'Тип поиска базы знаний. Возможные значения: HYBRID и SEMANTIC. Если не указан, будет использован по умолчанию. Обратитесь к документации AWS для получения дополнительной информации',
                options: [
                    {
                        label: 'HYBRID',
                        name: 'HYBRID',
                        description: 'Гибридный тип поиска'
                    },
                    {
                        label: 'SEMANTIC',
                        name: 'SEMANTIC',
                        description: 'Семантический тип поиска'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: undefined
            },
            {
                label: 'Фильтр',
                name: 'filter',
                type: 'string',
                description: 'Фильтр извлечения базы знаний. Прочитайте документацию для синтаксиса фильтра',
                optional: true,
                additionalParams: true
            }
        ]
    }

    loadMethods = {
        // Reuse the AWS Bedrock Embeddings region list as it should be same for all Bedrock functions
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.EMBEDDING, 'AWSBedrockEmbeddings')
        }
    }

    async init(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const knoledgeBaseID = nodeData.inputs?.knoledgeBaseID as string
        const region = nodeData.inputs?.region as string
        const topK = nodeData.inputs?.topK as number
        const overrideSearchType = (nodeData.inputs?.searchType != '' ? nodeData.inputs?.searchType : undefined) as 'HYBRID' | 'SEMANTIC'
        const filter = (nodeData.inputs?.filter != '' ? JSON.parse(nodeData.inputs?.filter) : undefined) as RetrievalFilter
        let credentialApiKey = ''
        let credentialApiSecret = ''
        let credentialApiSession = ''

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        if (credentialData && Object.keys(credentialData).length !== 0) {
            credentialApiKey = getCredentialParam('awsKey', credentialData, nodeData)
            credentialApiSecret = getCredentialParam('awsSecret', credentialData, nodeData)
            credentialApiSession = getCredentialParam('awsSession', credentialData, nodeData)
        }

        const retriever = new AmazonKnowledgeBaseRetriever({
            topK: topK,
            knowledgeBaseId: knoledgeBaseID,
            region: region,
            filter,
            overrideSearchType,
            clientOptions: {
                credentials: {
                    accessKeyId: credentialApiKey,
                    secretAccessKey: credentialApiSecret,
                    sessionToken: credentialApiSession
                }
            }
        })

        return retriever
    }
}

module.exports = { nodeClass: AWSBedrockKBRetriever_Retrievers }
