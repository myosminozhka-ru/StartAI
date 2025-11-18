import { BaseCache } from '@langchain/core/caches'
import { ICommonObject, IMultiModalOption, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { getModels, getRegions, MODEL_TYPE } from '../../../src/modelLoader'
import { ChatBedrockConverseInput, ChatBedrockConverse } from '@langchain/aws'
import { BedrockChat } from './FlowiseAWSChatBedrock'

/**
 * @author Michael Connor <mlconnor@yahoo.com>
 */
class AWSChatBedrock_ChatModels implements INode {
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
        this.label = 'AWS ChatBedrock'
        this.name = 'awsChatBedrock'
        this.version = 6.1
        this.type = 'AWSChatBedrock'
        this.icon = 'aws.svg'
        this.category = 'Chat Models'
        this.description = 'Обертка для больших языковых моделей AWS Bedrock, использующих Converse API'
        this.baseClasses = [this.type, ...getBaseClasses(ChatBedrockConverse)]
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
                loadMethod: 'listModels',
                default: 'anthropic.claude-3-haiku-20240307-v1:0'
            },
            {
                label: 'Пользовательское название модели',
                name: 'customModel',
                description: 'Если указано, переопределит модель, выбранную из опции Название модели',
                type: 'string',
                optional: true
            },
            {
                label: 'Потоковая передача',
                name: 'streaming',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
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
                label: 'Максимальное количество токенов',
                name: 'max_tokens_to_sample',
                type: 'number',
                step: 10,
                description:
                    'Параметр максимального количества токенов может не применяться к определенным моделям. Пожалуйста, проверьте доступные параметры модели',
                optional: true,
                additionalParams: true,
                default: 200
            },
            {
                label: 'Разрешить загрузку изображений',
                name: 'allowImageUploads',
                type: 'boolean',
                description:
                    'Разрешить ввод изображений. Подробнее в <a href="https://docs.flowiseai.com/using-flowise/uploads#image" target="_blank">документации</a>.',
                default: false,
                optional: true
            },
            {
                label: 'Latency Optimized',
                name: 'latencyOptimized',
                type: 'boolean',
                description:
                    'Enable latency optimized configuration for supported models. Refer to the supported <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/latency-optimized-inference.html" target="_blank">latecny optimized models</a> for more details.',
                default: false,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<INodeOptionsValue[]> {
            return await getModels(MODEL_TYPE.CHAT, 'awsChatBedrock')
        },
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.CHAT, 'awsChatBedrock')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const iRegion = nodeData.inputs?.region as string
        const iModel = nodeData.inputs?.model as string
        const customModel = nodeData.inputs?.customModel as string
        const iTemperature = nodeData.inputs?.temperature as string
        const iMax_tokens_to_sample = nodeData.inputs?.max_tokens_to_sample as string
        const cache = nodeData.inputs?.cache as BaseCache
        const streaming = nodeData.inputs?.streaming as boolean
        const latencyOptimized = nodeData.inputs?.latencyOptimized as boolean

        const obj: ChatBedrockConverseInput = {
            region: iRegion,
            model: customModel ? customModel : iModel,
            maxTokens: parseInt(iMax_tokens_to_sample, 10),
            temperature: parseFloat(iTemperature),
            streaming: streaming ?? true
        }

        if (latencyOptimized) {
            obj.performanceConfig = { latency: 'optimized' }
        }

        /**
         * Долгосрочные учетные данные, указанные в конфигурации LLM, являются необязательными.
         * Поставщик учетных данных Bedrock использует AWS SDK для получения
         * учетных данных из текущей среды выполнения.
         * При указании учетных данных мы переопределяем поставщика по умолчанию
         * настроенными значениями.
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

        const allowImageUploads = nodeData.inputs?.allowImageUploads as boolean

        const multiModalOption: IMultiModalOption = {
            image: {
                allowImageUploads: allowImageUploads ?? false
            }
        }

        const amazonBedrock = new BedrockChat(nodeData.id, obj)
        amazonBedrock.setMultiModalOption(multiModalOption)
        return amazonBedrock
    }
}

module.exports = { nodeClass: AWSChatBedrock_ChatModels }
