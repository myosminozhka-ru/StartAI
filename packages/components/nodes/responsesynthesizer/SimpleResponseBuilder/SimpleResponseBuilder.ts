import { INode, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { ResponseSynthesizerClass } from '../base'

class SimpleResponseBuilder_LlamaIndex implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Простой построитель ответов'
        this.name = 'simpleResponseBuilderLlamaIndex'
        this.version = 1.0
        this.type = 'SimpleResponseBuilder'
        this.icon = 'simplerb.svg'
        this.category = 'Response Synthesizer'
        this.description = `Применить запрос к коллекции текстовых фрагментов, собрать ответы в массив и вернуть объединенную строку всех ответов. Полезно для отдельных запросов на каждый текстовый фрагмент.`
        this.baseClasses = [this.type, 'ResponseSynthesizer']
        this.tags = ['LlamaIndex']
        this.inputs = []
    }

    async init(): Promise<any> {
        return new ResponseSynthesizerClass({ type: 'SimpleResponseBuilder' })
    }
}

module.exports = { nodeClass: SimpleResponseBuilder_LlamaIndex }
