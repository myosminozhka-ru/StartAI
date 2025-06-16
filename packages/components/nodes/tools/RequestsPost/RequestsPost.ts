import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { RequestParameters, desc, RequestsPostTool } from './core'

class RequestsPost_Tools implements INode {
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
        this.label = 'Запрос POST'
        this.name = 'requestsPost'
        this.version = 1.0
        this.type = 'RequestsPost'
        this.icon = 'requestspost.svg'
        this.category = 'Tools'
        this.description = 'Выполнение HTTP POST запросов'
        this.baseClasses = [this.type, ...getBaseClasses(RequestsPostTool)]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                description:
                    'Агент сделает запрос по этому точному URL. Если не указано, агент попытается определить URL самостоятельно из AIPlugin, если он предоставлен',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Тело запроса',
                name: 'body',
                type: 'json',
                description:
                    'JSON тело для POST запроса. Если не указано, агент попытается определить его самостоятельно из AIPlugin, если он предоставлен',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Описание',
                name: 'description',
                type: 'string',
                rows: 4,
                default: desc,
                description: 'Действует как подсказка для агента, когда он должен использовать этот инструмент',
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
        const body = nodeData.inputs?.body as string

        const obj: RequestParameters = {}
        if (url) obj.url = url
        if (description) obj.description = description
        if (headers) {
            const parsedHeaders = typeof headers === 'object' ? headers : JSON.parse(headers)
            obj.headers = parsedHeaders
        }
        if (body) {
            const parsedBody = typeof body === 'object' ? body : JSON.parse(body)
            obj.body = parsedBody
        }

        return new RequestsPostTool(obj)
    }
}

module.exports = { nodeClass: RequestsPost_Tools }
