import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { desc, RequestParameters, RequestsGetTool } from './core'

class RequestsGet_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Requests Get'
        this.name = 'requestsGet'
        this.version = 1.0
        this.type = 'RequestsGet'
        this.icon = 'requestsget.svg'
        this.category = 'Tools'
        this.description = 'Выполнение HTTP GET запросов'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsGetTool)]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                description:
                    'Агент будет делать вызов к этому точному URL. Если не указано, агент попытается сам разобраться из AIPlugin, если предоставлен',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Описание',
                name: 'description',
                type: 'string',
                rows: 4,
                default: desc,
                description: 'Действует как промпт, чтобы сказать агенту, когда он должен использовать этот инструмент',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Заголовки',
                name: 'headers',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const headers = nodeData.inputs?.headers as string
        const url = nodeData.inputs?.url as string
        const description = nodeData.inputs?.description as string

        const obj: RequestParameters = {}
        if (url) obj.url = url
        if (description) obj.description = description
        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(headers)
            obj.headers = parsedHeaders
        }

        return new RequestsGetTool(obj)
    }
}

module.exports = { nodeClass: RequestsGet_Tools }
