import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { OllamaParams, Ollama } from 'llamaindex'

class ChatOllama_LlamaIndex_ChatModels implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'ChatOllama'
        this.name = 'chatOllama_LlamaIndex'
        this.version = 1.0
        this.type = 'ChatOllama'
        this.icon = 'Ollama.svg'
        this.category = 'Chat Models'
        this.description = 'Wrapper around ChatOllama LLM specific for LlamaIndex'
        this.baseClasses = [this.type, 'BaseChatModel_LlamaIndex', ...getBaseClasses(Ollama)]
        this.tags = ['LlamaIndex']
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
                placeholder: 'llama3'
            },
            {
                label: 'Температура',
                name: 'temperature',
                type: 'number',
                description:
                    'Температура модели. Увеличение температуры заставит модель отвечать более творчески. (По умолчанию: 0.8). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 0.1,
                default: 0.9,
                optional: true
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                description:
                    'Работает вместе с top-k. Более высокое значение (например, 0.95) приведет к более разнообразному тексту, а более низкое значение (например, 0.5) будет генерировать более сфокусированный и консервативный текст. (По умолчанию: 0.9). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                description:
                    'Уменьшает вероятность генерации бессмыслицы. Более высокое значение (например, 100) даст более разнообразные ответы, а более низкое значение (например, 10) будет более консервативным. (По умолчанию: 40). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Mirostat',
                name: 'mirostat',
                type: 'number',
                description:
                    'Включить сэмплинг Mirostat для контроля перплексии. (по умолчанию: 0, 0 = отключено, 1 = Mirostat, 2 = Mirostat 2.0). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Mirostat ETA',
                name: 'mirostatEta',
                type: 'number',
                description:
                    'Влияет на то, как быстро алгоритм реагирует на обратную связь от сгенерированного текста. Более низкая скорость обучения приведет к более медленным корректировкам, а более высокая скорость обучения сделает алгоритм более отзывчивым. (По умолчанию: 0.1) См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Mirostat TAU',
                name: 'mirostatTau',
                type: 'number',
                description:
                    'Контролирует баланс между связностью и разнообразием вывода. Более низкое значение приведет к более сфокусированному и связному тексту. (По умолчанию: 5.0) См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Размер окна контекста',
                name: 'numCtx',
                type: 'number',
                description:
                    'Устанавливает размер окна контекста, используемого для генерации следующего токена. (По умолчанию: 2048) См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Количество GPU',
                name: 'numGpu',
                type: 'number',
                description:
                    'Количество слоев для отправки на GPU. В macOS по умолчанию 1 для включения поддержки metal, 0 для отключения. См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Количество потоков',
                name: 'numThread',
                type: 'number',
                description:
                    'Устанавливает количество потоков для использования во время вычислений. По умолчанию Ollama будет определять это для оптимальной производительности. Рекомендуется установить это значение равным количеству физических ядер CPU в вашей системе (в отличие от логического количества ядер). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Повторить последние N',
                name: 'repeatLastN',
                type: 'number',
                description:
                    'Устанавливает, как далеко назад модель должна смотреть, чтобы предотвратить повторение. (По умолчанию: 64, 0 = отключено, -1 = num_ctx). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Штраф за повторение',
                name: 'repeatPenalty',
                type: 'number',
                description:
                    'Устанавливает, насколько сильно штрафовать повторения. Более высокое значение (например, 1.5) будет более строго штрафовать повторения, а более низкое значение (например, 0.9) будет более снисходительным. (По умолчанию: 1.1). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 0.1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Стоп-последовательность',
                name: 'stop',
                type: 'string',
                rows: 4,
                placeholder: 'AI assistant:',
                description:
                    'Устанавливает стоп-последовательности для использования. Используйте запятую для разделения различных последовательностей. См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Свободный сэмплинг хвоста',
                name: 'tfsZ',
                type: 'number',
                description:
                    'Свободный сэмплинг хвоста используется для уменьшения влияния менее вероятных токенов из вывода. Более высокое значение (например, 2.0) уменьшит влияние больше, а значение 1.0 отключит эту настройку. (По умолчанию: 1). См. <a target="_blank" href="https://github.com/jmorganca/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values">документацию</a> для получения дополнительной информации',
                step: 0.1,
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const baseUrl = nodeData.inputs?.baseUrl as string
        const modelName = nodeData.inputs?.modelName as string
        const topP = nodeData.inputs?.topP as string
        const topK = nodeData.inputs?.topK as string
        const mirostat = nodeData.inputs?.mirostat as string
        const mirostatEta = nodeData.inputs?.mirostatEta as string
        const mirostatTau = nodeData.inputs?.mirostatTau as string
        const numCtx = nodeData.inputs?.numCtx as string
        const numGpu = nodeData.inputs?.numGpu as string
        const numThread = nodeData.inputs?.numThread as string
        const repeatLastN = nodeData.inputs?.repeatLastN as string
        const repeatPenalty = nodeData.inputs?.repeatPenalty as string
        const stop = nodeData.inputs?.stop as string
        const tfsZ = nodeData.inputs?.tfsZ as string

        const obj: OllamaParams = {
            model: modelName,
            options: {},
            config: {
                host: baseUrl
            }
        }

        if (temperature) obj.options.temperature = parseFloat(temperature)
        if (topP) obj.options.top_p = parseFloat(topP)
        if (topK) obj.options.top_k = parseFloat(topK)
        if (mirostat) obj.options.mirostat = parseFloat(mirostat)
        if (mirostatEta) obj.options.mirostat_eta = parseFloat(mirostatEta)
        if (mirostatTau) obj.options.mirostat_tau = parseFloat(mirostatTau)
        if (numCtx) obj.options.num_ctx = parseFloat(numCtx)
        if (numGpu) obj.options.main_gpu = parseFloat(numGpu)
        if (numThread) obj.options.num_thread = parseFloat(numThread)
        if (repeatLastN) obj.options.repeat_last_n = parseFloat(repeatLastN)
        if (repeatPenalty) obj.options.repeat_penalty = parseFloat(repeatPenalty)
        if (tfsZ) obj.options.tfs_z = parseFloat(tfsZ)
        if (stop) {
            const stopSequences = stop.split(',')
            obj.options.stop = stopSequences
        }

        const model = new Ollama(obj)
        return model
    }
}

module.exports = { nodeClass: ChatOllama_LlamaIndex_ChatModels }
