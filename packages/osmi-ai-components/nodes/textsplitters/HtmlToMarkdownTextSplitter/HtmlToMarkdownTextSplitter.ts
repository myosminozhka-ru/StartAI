import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MarkdownTextSplitter, MarkdownTextSplitterParams } from 'langchain/text_splitter'
import { NodeHtmlMarkdown } from 'node-html-markdown'

class HtmlToMarkdownTextSplitter_TextSplitters implements INode {
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
        this.label = 'HtmlToMarkdown Text Splitter'
        this.name = 'htmlToMarkdownTextSplitter'
        this.version = 1.0
        this.type = 'HtmlToMarkdownTextSplitter'
        this.icon = 'htmlToMarkdownTextSplitter.svg'
        this.category = 'Text Splitters'
        this.description = `Преобразует HTML в Markdown и затем разделяет ваш контент на документы на основе заголовков Markdown`
        this.baseClasses = [this.type, ...getBaseClasses(HtmlToMarkdownTextSplitter)]
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
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const chunkSize = nodeData.inputs?.chunkSize as string
        const chunkOverlap = nodeData.inputs?.chunkOverlap as string

        const obj = {} as MarkdownTextSplitterParams

        if (chunkSize) obj.chunkSize = parseInt(chunkSize, 10)
        if (chunkOverlap) obj.chunkOverlap = parseInt(chunkOverlap, 10)

        const splitter = new HtmlToMarkdownTextSplitter(obj)

        return splitter
    }
}
class HtmlToMarkdownTextSplitter extends MarkdownTextSplitter implements MarkdownTextSplitterParams {
    constructor(fields?: Partial<MarkdownTextSplitterParams>) {
        {
            super(fields)
        }
    }
    splitText(text: string): Promise<string[]> {
        return new Promise((resolve) => {
            const markdown = NodeHtmlMarkdown.translate(text)
            super.splitText(markdown).then((result) => {
                resolve(result)
            })
        })
    }
}
module.exports = { nodeClass: HtmlToMarkdownTextSplitter_TextSplitters }
