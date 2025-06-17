import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama'
import { OllamaInput } from '@langchain/community/llms/ollama'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class OllamaEmbedding_Embeddings implements INode {
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
        this.label = 'Ollama Embeddings'
        this.name = 'ollamaEmbedding'
        this.version = 1.0
        this.type = 'OllamaEmbeddings'
        this.icon = 'Ollama.svg'
        this.category = 'Embeddings'
        this.description = 'Генерация эмбеддингов для заданного текста с использованием открытой модели на Ollama'
        this.baseClasses = [this.type, ...getBaseClasses(OllamaEmbeddings)]
        this.inputs = [
            {
                label: 'Базовый URL',
                name: 'baseUrl',
                type: 'string',
                default: 'http://localhost:11434'
            },
            {
                label: 'Название модели',
                name: 'modelName',
                type: 'string',
                placeholder: 'llama2'
            },
            {
                label: 'Количество GPU',
                name: 'numGpu',
                type: 'number',
                description:
                    'Количество слоев для отправки на GPU. В macOS по умолчанию 1 для включения поддержки metal, 0 для отключения. См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для подробностей',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Количество потоков',
                name: 'numThread',
                type: 'number',
                description:
                    'Устанавливает количество потоков для использования во время вычислений. По умолчанию Ollama определит это для оптимальной производительности. Рекомендуется установить это значение равным количеству физических ядер CPU в вашей системе (в отличие от логического количества ядер). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для подробностей',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Использовать MMap',
                name: 'useMMap',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const modelName = nodeData.inputs?.modelName as string
        const baseUrl = nodeData.inputs?.baseUrl as string
        const numThread = nodeData.inputs?.numThread as string
        const numGpu = nodeData.inputs?.numGpu as string
        const useMMap = nodeData.inputs?.useMMap as boolean

        const obj = {
            model: modelName,
            baseUrl,
            requestOptions: {}
        }

        const requestOptions: OllamaInput = {}
        if (numThread) requestOptions.numThread = parseFloat(numThread)
        if (numGpu) requestOptions.numGpu = parseFloat(numGpu)

        // default useMMap to true
        requestOptions.useMMap = useMMap === undefined ? true : useMMap

        if (Object.keys(requestOptions).length) obj.requestOptions = requestOptions

        const model = new OllamaEmbeddings(obj)
        return model
    }
}

module.exports = { nodeClass: OllamaEmbedding_Embeddings }
