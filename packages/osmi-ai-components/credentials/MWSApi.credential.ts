import { INodeParams, INodeCredential } from '../src/Interface'

class MWSApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'MWS API'
        this.name = 'mwsApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'MWS API Key',
                name: 'mwsApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: MWSApi }
