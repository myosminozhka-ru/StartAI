import { SerpAPI } from '@langchain/community/tools/serpapi'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class SerpAPI_Tools implements INode {
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
        this.label = 'Serp API'
        this.name = 'serpAPI'
        this.version = 1.0
        this.type = 'SerpAPI'
        this.icon = 'serp.svg'
        this.category = 'Tools'
        this.description = 'Обертка вокруг SerpAPI - API в реальном времени для доступа к результатам поиска Google'
        this.inputs = []
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['serpApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(SerpAPI)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const serpApiKey = getCredentialParam('serpApiKey', credentialData, nodeData)
        return new SerpAPI(serpApiKey)
    }
}

module.exports = { nodeClass: SerpAPI_Tools }
