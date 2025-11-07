import { INodeParams, INodeCredential } from '../src/Interface'

class MWSApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'MWS API'
        this.name = 'mwsApi'
        this.version = 1.0
        this.description = 'МТС Web Services API ключ для доступа к языковым моделям'
        this.inputs = [
            {
                label: 'MWS API Key',
                name: 'mwsApiKey',
                type: 'password',
                placeholder: 'sk-ваш-mws-api-ключ'
            },
            {
                label: 'MWS API Base URL',
                name: 'mwsApiBaseUrl',
                type: 'string',
                default: 'https://api.gpt.mws.ru/v1',
                placeholder: 'https://api.gpt.mws.ru/v1'
            }
        ]
    }
}

module.exports = { credClass: MWSApi }
