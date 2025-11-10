import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { CharacterTextSplitter, CharacterTextSplitterParams } from 'langchain/text_splitter'

class CharacterTextSplitter_TextSplitters implements INode {
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
        this.label = 'Разделитель текста по символам'
        this.name = 'characterTextSplitter'
        this.version = 1.0
        this.type = 'CharacterTextSplitter'
        this.icon = 'textsplitter.svg'
        this.category = 'Text Splitters'
        this.description = `разделяет только по одному типу символов (по умолчанию "\\n\\n").`
        this.baseClasses = [this.type, ...getBaseClasses(CharacterTextSplitter)]
        this.inputs = [
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
            },
            {
                label: 'Пользовательский разделитель',
                name: 'separator',
                type: 'string',
                placeholder: `" "`,
                description: 'Разделитель для определения места разделения текста, переопределит разделитель по умолчанию',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const separator = nodeData.inputs?.separator as string
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string

        const obj = {} as CharacterTextSplitterParams

        if (separator) obj.separator = separator
        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new CharacterTextSplitter(obj)

        return splitter
    }
}

module.exports = { nodeClass: CharacterTextSplitter_TextSplitters }
