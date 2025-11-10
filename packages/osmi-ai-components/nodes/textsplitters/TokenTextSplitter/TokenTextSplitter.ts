import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { TokenTextSplitter, TokenTextSplitterParams } from 'langchain/text_splitter'
import { TiktokenEncoding } from '@dqbd/tiktoken'

class TokenTextSplitter_TextSplitters implements INode {
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
        this.label = 'Token Text Splitter'
        this.name = 'tokenTextSplitter'
        this.version = 1.0
        this.type = 'TokenTextSplitter'
        this.icon = 'tiktoken.svg'
        this.category = 'Text Splitters'
        this.description = `Разделяет необработанную текстовую строку, сначала преобразуя текст в BPE токены, затем разделяет эти токены на фрагменты и преобразует токены в пределах одного фрагмента обратно в текст.`
        this.baseClasses = [this.type, ...getBaseClasses(TokenTextSplitter)]
        this.inputs = [
            {
                label: 'Название кодировки',
                name: 'encodingName',
                type: 'options',
                options: [
                    {
                        label: 'gpt2',
                        name: 'gpt2'
                    },
                    {
                        label: 'r50k_base',
                        name: 'r50k_base'
                    },
                    {
                        label: 'p50k_base',
                        name: 'p50k_base'
                    },
                    {
                        label: 'p50k_edit',
                        name: 'p50k_edit'
                    },
                    {
                        label: 'cl100k_base',
                        name: 'cl100k_base'
                    }
                ],
                default: 'gpt2'
            },
            {
                label: 'Размер фрагмента',
                name: 'chunkSize',
                type: 'number',
                description: 'Количество символов в каждом фрагменте. По умолчанию 1000.',
                default: 1000,
                optional: true
            },
            {
                label: 'Перекрытие фрагментов',
                name: 'chunkOverlap',
                type: 'number',
                description: 'Количество символов для перекрытия между фрагментами. По умолчанию 200.',
                default: 200,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const encodingName = nodeData.inputs?.encodingName as string
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string

        const obj = {} as TokenTextSplitterParams

        obj.encodingName = encodingName as TiktokenEncoding
        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new TokenTextSplitter(obj)

        return splitter
    }
}

module.exports = { nodeClass: TokenTextSplitter_TextSplitters }
