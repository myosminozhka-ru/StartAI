import { Bedrock } from '@langchain/community/llms/bedrock'
import { BaseCache } from '@langchain/core/caches'
import { BaseLLMParams } from '@langchain/core/language_models/llms'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BaseBedrockInput } from '@langchain/community/dist/utils/bedrock'
import { getModels, getRegions, MODEL_TYPE } from '../../../src/modelLoader'

/**
 * @author Michael Connor <mlconnor@yahoo.com>
 */
class AWSBedrock_LLMs implements INode {
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
        this.label = 'AWS Bedrock'
        this.name = 'awsBedrock'
        this.version = 4.0
        this.type = 'AWSBedrock'
        this.icon = 'aws.svg'
        this.category = 'LLMs'
        this.description = 'Обертка вокруг больших языковых моделей AWS Bedrock'
        this.baseClasses = [this.type, ...getBaseClasses(Bedrock)]
        this.credential = {
            label: 'Учетные данные AWS',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Кэш',
                name: 'cache',
                type: 'BaseCache',
                optional: true
            },
            {
                label: 'Регион',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
            },
            {
                label: 'Название модели',
                name: 'model',
                type: 'asyncOptions',
                loadMethod: 'listModels'
            },
            {
                label: 'Пользовательское название модели',
                name: 'customModel',
                description: 'Если указано, переопределит модель, выбранную из опции "Название модели"',
                type: 'string',
                optional: true
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                description:
                    'Параметр температуры может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true,
                default: 0.7
            },
            {
                label: 'Максимальное количество токенов для выборки',
                name: 'max_tokens_to_sample',
                type: 'number',
                step: 10,
                description:
                    'Параметр максимального количества токенов может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true,
                default: 200
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.LLM, 'awsBedrock')
        },
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.LLM, 'awsBedrock')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iRegion = nodeData.inputs?.region as string
        const iModel = nodeData.inputs?.model as string
        const customModel = nodeData.inputs?.customModel as string
        const iTemperature = nodeData.inputs?.temperature as string
        const iMax_tokens_to_sample = nodeData.inputs?.max_tokens_to_sample as string
        const cache = nodeData.inputs?.cache as BaseCache
        const obj: Partial<BaseBedrockInput> & BaseLLMParams = {
            model: customModel ? customModel : iModel,
            region: iRegion,
            temperature: parseFloat(iTemperature),
            maxTokens: parseInt(iMax_tokens_to_sample, 10)
        }

        /**
         * Long-term credentials specified in LLM configuration are optional.
         * Bedrock's credential provider falls back to the AWS SDK to fetch
         * credentials from the running environment.
         * When specified, we override the default provider with configured values.
         * @see https://github.com/aws/aws-sdk-js-v3/blob/main/packages/credential-provider-node/README.md
         */
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        if (credentialData && Object.keys(credentialData).length !== 0) {
            const credentialApiKey = getCredentialParam('awsKey', credentialData, nodeData)
            const credentialApiSecret = getCredentialParam('awsSecret', credentialData, nodeData)
            const credentialApiSession = getCredentialParam('awsSession', credentialData, nodeData)

            obj.credentials = {
                accessKeyId: credentialApiKey,
                secretAccessKey: credentialApiSecret,
                sessionToken: credentialApiSession
            }
        }
        if (cache) obj.cache = cache

        const amazonBedrock = new Bedrock(obj)
        return amazonBedrock
    }
}

module.exports = { nodeClass: AWSBedrock_LLMs }
