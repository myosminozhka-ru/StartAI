import { INode, INodeParams } from '../../../src/Interface'

class StickyNote_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Заметка'
        this.name = 'stickyNoteAgentflow'
        this.version = 1.0
        this.type = 'StickyNote'
        this.color = '#fee440'
        this.category = 'Agent Flows'
        this.description = 'Добавить заметки в агентский поток'
        this.inputs = [
            {
                label: '',
                name: 'note',
                type: 'string',
                rows: 1,
                placeholder: 'Введите текст здесь',
                optional: true
            }
        ]
        this.baseClasses = [this.type]
    }

    async run(): Promise<any> {
        return undefined
    }
}

module.exports = { nodeClass: StickyNote_Agentflow }
