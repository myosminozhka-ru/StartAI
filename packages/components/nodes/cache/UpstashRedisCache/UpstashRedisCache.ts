import { UpstashRedisCache as LangchainUpstashRedisCache } from '@langchain/community/caches/upstash_redis'
import { getBaseClasses, getCredentialData, getCredentialParam, ICommonObject, INode, INodeData, INodeParams } from '../../../src'

class UpstashRedisCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Кэш Upstash Redis'
        this.name = 'upstashRedisCache'
        this.version = 1.0
        this.type = 'UpstashRedisCache'
        this.description = 'Кэширование ответов LLM в Upstash Redis, бессерверные данные для Redis и Kafka'
        this.icon = 'Upstash.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(LangchainUpstashRedisCache)]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            optional: true,
            credentialNames: ['upstashRedisApi']
        }
        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const upstashConnectionUrl = getCredentialParam('upstashConnectionUrl', credentialData, nodeData)
        const upstashToken = getCredentialParam('upstashConnectionToken', credentialData, nodeData)

        const cache = new LangchainUpstashRedisCache({
            config: {
                url: upstashConnectionUrl,
                token: upstashToken
            }
        })
        return cache
    }
}

module.exports = { nodeClass: UpstashRedisCache }
