import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import {
    RecursiveCharacterTextSplitter,
    RecursiveCharacterTextSplitterParams,
    SupportedTextSplitterLanguage
} from 'langchain/text_splitter'

class CodeTextSplitter_TextSplitters implements INode {
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
        this.label = 'Code Text Splitter'
        this.name = 'codeTextSplitter'
        this.version = 1.0
        this.type = 'CodeTextSplitter'
        this.icon = 'codeTextSplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Разделение документов на основе синтаксиса, специфичного для языка программирования`
        this.baseClasses = [this.type, ...getBaseClasses(RecursiveCharacterTextSplitter)]
        this.inputs = [
            {
                label: 'Язык',
                name: 'language',
                type: 'options',
                options: [
                    {
                        label: 'cpp',
                        name: 'cpp'
                    },
                    {
                        label: 'go',
                        name: 'go'
                    },
                    {
                        label: 'java',
                        name: 'java'
                    },
                    {
                        label: 'js',
                        name: 'js'
                    },
                    {
                        label: 'php',
                        name: 'php'
                    },
                    {
                        label: 'proto',
                        name: 'proto'
                    },
                    {
                        label: 'python',
                        name: 'python'
                    },
                    {
                        label: 'rst',
                        name: 'rst'
                    },
                    {
                        label: 'ruby',
                        name: 'ruby'
                    },
                    {
                        label: 'rust',
                        name: 'rust'
                    },
                    {
                        label: 'scala',
                        name: 'scala'
                    },
                    {
                        label: 'swift',
                        name: 'swift'
                    },
                    {
                        label: 'markdown',
                        name: 'markdown'
                    },
                    {
                        label: 'latex',
                        name: 'latex'
                    },
                    {
                        label: 'html',
                        name: 'html'
                    },
                    {
                        label: 'sol',
                        name: 'sol'
                    }
                ]
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
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string
        const language = nodeData.inputs?.language as SupportedTextSplitterLanguage

        const obj = {} as RecursiveCharacterTextSplitterParams

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = RecursiveCharacterTextSplitter.fromLanguage(language, obj)

        return splitter
    }
}
module.exports = { nodeClass: CodeTextSplitter_TextSplitters }
