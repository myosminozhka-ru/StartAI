import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { BaseLLM } from 'langchain/llms/base'
import { CallbackManagerForLLMRun } from 'langchain/callbacks'
import { loadMWSModels } from '../../../src/mwsModelLoader'

class MWS_LLMs implements INode {
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
        this.label = 'MWS LLM'
        this.name = 'mwsLLM'
        this.version = 1.0
        this.type = 'MWS LLM'
        this.icon = 'mws.svg'
        this.category = 'LLMs'
        this.description = 'MWS (МТС) LLM для генерации текста'
        this.baseClasses = [this.type, ...getBaseClasses(BaseLLM)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mwsApi']
        }
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                default: 'mws-gpt-alpha'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Frequency Penalty',
                name: 'frequencyPenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Presence Penalty',
                name: 'presencePenalty',
                type: 'number',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(): Promise<{ label: string; name: string }[]> {
            return await loadMWSModels()
        }
    }

    async init(nodeData: INodeData): Promise<MWSLLM> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const topP = nodeData.inputs?.topP as string
        const frequencyPenalty = nodeData.inputs?.frequencyPenalty as string
        const presencePenalty = nodeData.inputs?.presencePenalty as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', 'mwsApi')
        const mwsApiKey = getCredentialParam('mwsApiKey', credentialData, nodeData)

        const obj: Partial<MWSLLMInput> = {
            modelName: modelName,
            mwsApiKey: mwsApiKey
        }

        if (temperature) obj.temperature = parseFloat(temperature)
        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)
        if (topP) obj.topP = parseFloat(topP)
        if (frequencyPenalty) obj.frequencyPenalty = parseFloat(frequencyPenalty)
        if (presencePenalty) obj.presencePenalty = parseFloat(presencePenalty)

        const model = new MWSLLM(obj)
        return model
    }
}

interface MWSLLMInput {
    modelName: string
    mwsApiKey: string
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
}

class MWSLLM extends BaseLLM {
    modelName: string
    mwsApiKey: string
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number

    constructor(fields: MWSLLMInput) {
        super(fields)
        this.modelName = fields.modelName
        this.mwsApiKey = fields.mwsApiKey
        this.temperature = fields.temperature
        this.maxTokens = fields.maxTokens
        this.topP = fields.topP
        this.frequencyPenalty = fields.frequencyPenalty
        this.presencePenalty = fields.presencePenalty
    }

    _llmType(): string {
        return 'mws'
    }

    async _call(prompt: string, options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): Promise<string> {
        const body = {
            model: this.modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            top_p: this.topP,
            frequency_penalty: this.frequencyPenalty,
            presence_penalty: this.presencePenalty
        }

        const response = await fetch('https://api.gpt.mws.ru/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.mwsApiKey}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            throw new Error(`MWS API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        return data.choices[0]?.message?.content || ''
    }
}

module.exports = { nodeClass: MWS_LLMs }
