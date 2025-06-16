import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import axios, { AxiosRequestConfig, Method, ResponseType } from 'axios'
import FormData from 'form-data'
import * as querystring from 'querystring'
import { getCredentialData, getCredentialParam } from '../../../src/utils'

class HTTP_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'HTTP'
        this.name = 'httpAgentflow'
        this.version = 1.1
        this.type = 'HTTP'
        this.category = 'Agent Flows'
        this.description = 'Отправить HTTP запрос'
        this.baseClasses = [this.type]
        this.color = '#FF7F7F'
        this.credential = {
            label: 'HTTP учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['httpBasicAuth', 'httpBearerToken', 'httpApiKey'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Метод',
                name: 'method',
                type: 'options',
                options: [
                    {
                        label: 'GET',
                        name: 'GET'
                    },
                    {
                        label: 'POST',
                        name: 'POST'
                    },
                    {
                        label: 'PUT',
                        name: 'PUT'
                    },
                    {
                        label: 'DELETE',
                        name: 'DELETE'
                    },
                    {
                        label: 'PATCH',
                        name: 'PATCH'
                    }
                ],
                default: 'GET'
            },
            {
                label: 'URL',
                name: 'url',
                type: 'string'
            },
            {
                label: 'Заголовки',
                name: 'headers',
                type: 'array',
                acceptVariable: true,
                array: [
                    {
                        label: 'Ключ',
                        name: 'key',
                        type: 'string',
                        default: ''
                    },
                    {
                        label: 'Значение',
                        name: 'value',
                        type: 'string',
                        default: '',
                        acceptVariable: true
                    }
                ],
                optional: true
            },
            {
                label: 'Параметры запроса',
                name: 'queryParams',
                type: 'array',
                acceptVariable: true,
                array: [
                    {
                        label: 'Ключ',
                        name: 'key',
                        type: 'string',
                        default: ''
                    },
                    {
                        label: 'Значение',
                        name: 'value',
                        type: 'string',
                        default: '',
                        acceptVariable: true
                    }
                ],
                optional: true
            },
            {
                label: 'Тип тела',
                name: 'bodyType',
                type: 'options',
                options: [
                    {
                        label: 'JSON',
                        name: 'json'
                    },
                    {
                        label: 'Сырой',
                        name: 'raw'
                    },
                    {
                        label: 'Данные формы',
                        name: 'formData'
                    },
                    {
                        label: 'x-www-form-urlencoded',
                        name: 'xWwwFormUrlencoded'
                    }
                ],
                optional: true
            },
            {
                label: 'Тело',
                name: 'body',
                type: 'string',
                acceptVariable: true,
                rows: 4,
                show: {
                    bodyType: ['raw', 'json']
                },
                optional: true
            },
            {
                label: 'Тело',
                name: 'body',
                type: 'array',
                acceptVariable: true,
                show: {
                    bodyType: ['xWwwFormUrlencoded', 'formData']
                },
                array: [
                    {
                        label: 'Ключ',
                        name: 'key',
                        type: 'string',
                        default: ''
                    },
                    {
                        label: 'Значение',
                        name: 'value',
                        type: 'string',
                        default: '',
                        acceptVariable: true
                    }
                ],
                optional: true
            },
            {
                label: 'Тип ответа',
                name: 'responseType',
                type: 'options',
                options: [
                    {
                        label: 'JSON',
                        name: 'json'
                    },
                    {
                        label: 'Текст',
                        name: 'text'
                    },
                    {
                        label: 'Array Buffer',
                        name: 'arraybuffer'
                    },
                    {
                        label: 'Сырой (Base64)',
                        name: 'base64'
                    }
                ],
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const method = nodeData.inputs?.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
        const url = nodeData.inputs?.url as string
        const headers = nodeData.inputs?.headers as ICommonObject
        const queryParams = nodeData.inputs?.queryParams as ICommonObject
        const bodyType = nodeData.inputs?.bodyType as 'json' | 'raw' | 'formData' | 'xWwwFormUrlencoded'
        const body = nodeData.inputs?.body as ICommonObject | string | ICommonObject[]
        const responseType = nodeData.inputs?.responseType as 'json' | 'text' | 'arraybuffer' | 'base64'

        const state = options.agentflowRuntime?.state as ICommonObject

        try {
            // Подготовка заголовков
            const requestHeaders: Record<string, string> = {}

            // Добавление заголовков из входных данных
            if (headers && Array.isArray(headers)) {
                for (const header of headers) {
                    if (header.key && header.value) {
                        requestHeaders[header.key] = header.value
                    }
                }
            }

            // Добавление учетных данных, если они предоставлены
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            if (credentialData && Object.keys(credentialData).length !== 0) {
                const basicAuthUsername = getCredentialParam('basicAuthUsername', credentialData, nodeData)
                const basicAuthPassword = getCredentialParam('basicAuthPassword', credentialData, nodeData)
                const bearerToken = getCredentialParam('token', credentialData, nodeData)
                const apiKeyName = getCredentialParam('key', credentialData, nodeData)
                const apiKeyValue = getCredentialParam('value', credentialData, nodeData)

                // Определение типа аутентификации на основе доступных учетных данных
                if (basicAuthUsername || basicAuthPassword) {
                    // Базовая аутентификация
                    const auth = Buffer.from(`${basicAuthUsername}:${basicAuthPassword}`).toString('base64')
                    requestHeaders['Authorization'] = `Basic ${auth}`
                } else if (bearerToken) {
                    // Токен Bearer
                    requestHeaders['Authorization'] = `Bearer ${bearerToken}`
                } else if (apiKeyName && apiKeyValue) {
                    // API ключ в заголовке
                    requestHeaders[apiKeyName] = apiKeyValue
                }
            }

            // Подготовка параметров запроса
            let queryString = ''
            if (queryParams && Array.isArray(queryParams)) {
                const params = new URLSearchParams()
                for (const param of queryParams) {
                    if (param.key && param.value) {
                        params.append(param.key, param.value)
                    }
                }
                queryString = params.toString()
            }

            // Построение финального URL с параметрами запроса
            const finalUrl = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url

            // Подготовка конфигурации запроса
            const requestConfig: AxiosRequestConfig = {
                method: method as Method,
                url: finalUrl,
                headers: requestHeaders,
                responseType: (responseType || 'json') as ResponseType
            }

            // Обработка тела запроса в зависимости от типа
            if (method !== 'GET' && body) {
                switch (bodyType) {
                    case 'json':
                        requestConfig.data = typeof body === 'string' ? JSON.parse(body) : body
                        requestHeaders['Content-Type'] = 'application/json'
                        break
                    case 'raw':
                        requestConfig.data = body
                        break
                    case 'formData': {
                        const formData = new FormData()
                        if (Array.isArray(body) && body.length > 0) {
                            for (const item of body) {
                                formData.append(item.key, item.value)
                            }
                        }
                        requestConfig.data = formData
                        break
                    }
                    case 'xWwwFormUrlencoded':
                        requestConfig.data = querystring.stringify(typeof body === 'string' ? JSON.parse(body) : body)
                        requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
                        break
                }
            }

            // Выполнение HTTP запроса
            const response = await axios(requestConfig)

            // Обработка ответа в зависимости от типа
            let responseData
            if (responseType === 'base64' && response.data) {
                responseData = Buffer.from(response.data, 'binary').toString('base64')
            } else {
                responseData = response.data
            }

            const returnOutput = {
                id: nodeData.id,
                name: this.name,
                input: {
                    http: {
                        method,
                        url,
                        headers,
                        queryParams,
                        bodyType,
                        body,
                        responseType
                    }
                },
                output: {
                    http: {
                        data: responseData,
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    }
                },
                state
            }

            return returnOutput
        } catch (error) {
            console.error('Ошибка HTTP запроса:', error)

            // Форматирование ответа с ошибкой
            const errorResponse: any = {
                id: nodeData.id,
                name: this.name,
                input: {
                    http: {
                        method,
                        url,
                        headers,
                        queryParams,
                        bodyType,
                        body,
                        responseType
                    }
                },
                error: {
                    name: error.name || 'Ошибка',
                    message: error.message || 'Произошла ошибка во время выполнения HTTP запроса'
                },
                state
            }

            // Добавление дополнительных деталей ошибки, если они доступны
            if (error.response) {
                errorResponse.error.status = error.response.status
                errorResponse.error.statusText = error.response.statusText
                errorResponse.error.data = error.response.data
                errorResponse.error.headers = error.response.headers
            }

            throw new Error(error)
        }
    }
}

module.exports = { nodeClass: HTTP_Agentflow }
