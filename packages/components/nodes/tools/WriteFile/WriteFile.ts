import { z } from 'zod'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { Serializable } from '@langchain/core/load/serializable'
import { NodeFileStore } from 'langchain/stores/file/node'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

abstract class BaseFileStore extends Serializable {
    abstract readFile(path: string): Promise<string>
    abstract writeFile(path: string, contents: string): Promise<void>
}

class WriteFile_Tools implements INode {
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
        this.label = 'Записать файл'
        this.name = 'writeFile'
        this.version = 1.0
        this.type = 'WriteFile'
        this.icon = 'writefile.svg'
        this.category = 'Tools'
        this.description = 'Записать файл на диск'
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(WriteFileTool)]
        this.inputs = [
            {
                label: 'Базовый путь',
                name: 'basePath',
                placeholder: `C:\\Users\\User\\Desktop`,
                type: 'string',
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const basePath = nodeData.inputs?.basePath as string
        const store = basePath ? new NodeFileStore(basePath) : new NodeFileStore()
        return new WriteFileTool({ store })
    }
}

interface WriteFileParams extends ToolParams {
    store: BaseFileStore
}

/**
 * Класс для записи данных в файлы на диске. Расширяет класс StructuredTool
 */
export class WriteFileTool extends StructuredTool {
    static lc_name() {
        return 'WriteFileTool'
    }

    schema = z.object({
        file_path: z.string().describe('имя файла'),
        text: z.string().describe('текст для записи в файл')
    }) as any

    name = 'write_file'

    description = 'Записать файл на диск'

    store: BaseFileStore

    constructor({ store, ...rest }: WriteFileParams) {
        super(rest)

        this.store = store
    }

    async _call({ file_path, text }: z.infer<typeof this.schema>) {
        await this.store.writeFile(file_path, text)
        return 'Файл успешно записан.'
    }
}

module.exports = { nodeClass: WriteFile_Tools }
