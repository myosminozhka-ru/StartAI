import { INodeData } from '../../src'
import { VectorStore } from '@langchain/core/vectorstores'

export const resolveVectorStoreOrRetriever = (
    nodeData: INodeData,
    vectorStore: VectorStore,
    metadataFilter?: string | object | undefined
) => {
    const output = nodeData.outputs?.output as string
    const searchType = nodeData.outputs?.searchType as string
    const topK = nodeData.inputs?.topK as string
    const k = topK ? parseFloat(topK) : 4
    const alpha = nodeData.inputs?.alpha

    // If it is already pre-defined in lc_kwargs, then don't pass it again
    const filter = vectorStore?.lc_kwargs?.filter ? undefined : metadataFilter

    if (output === 'retriever') {
        const searchKwargs: Record<string, any> = {}
        if (alpha !== undefined) {
            searchKwargs.alpha = parseFloat(alpha)
        }
        if ('mmr' === searchType) {
            const fetchK = nodeData.inputs?.fetchK as string
            const lambda = nodeData.inputs?.lambda as string
            const f = fetchK ? parseInt(fetchK) : 20
            const l = lambda ? parseFloat(lambda) : 0.5
            return vectorStore.asRetriever({
                searchType: 'mmr',
                k: k,
                filter,
                searchKwargs: {
                    //...searchKwargs,
                    fetchK: f,
                    lambda: l
                }
            })
        } else {
            // "searchType" is "similarity"
            return vectorStore.asRetriever({
                k: k,
                filter: filter,
                searchKwargs: Object.keys(searchKwargs).length > 0 ? searchKwargs : undefined
            })
        }
    } else if (output === 'vectorStore') {
        ;(vectorStore as any).k = k
        ;(vectorStore as any).filter = filter
        return vectorStore
    }
}

export const addMMRInputParams = (inputs: any[]) => {
    const mmrInputParams = [
        {
            label: 'Тип поиска',
            name: 'searchType',
            type: 'options',
            default: 'similarity',
            options: [
                {
                    label: 'Сходство',
                    name: 'similarity'
                },
                {
                    label: 'Максимальная маргинальная релевантность',
                    name: 'mmr'
                }
            ],
            additionalParams: true,
            optional: true
        },
        {
            label: 'Получить K (для MMR поиска)',
            name: 'fetchK',
            description:
                'Количество начальных документов для получения для MMR переранжирования. По умолчанию 20. Используется только когда тип поиска - MMR',
            placeholder: '20',
            type: 'number',
            additionalParams: true,
            optional: true
        },
        {
            label: 'Лямбда (для MMR поиска)',
            name: 'lambda',
            description:
                'Число от 0 до 1, которое определяет степень разнообразия среди результатов, где 0 соответствует максимальному разнообразию, а 1 - минимальному разнообразию. Используется только когда тип поиска - MMR',
            placeholder: '0.5',
            type: 'number',
            additionalParams: true,
            optional: true
        }
    ]

    inputs.push(...mmrInputParams)
}

export const howToUseFileUpload = `
**Загрузка файлов**

Это позволяет загружать файлы в чате. Загруженные файлы будут загружены на лету в векторное хранилище.

**Примечание:**
- Вы можете включить загрузку файлов только для одного векторного хранилища одновременно.
- По крайней мере один узел Document Loader должен быть подключен к входу документа.
- Document Loader должен быть типами файлов, такими как PDF, DOCX, TXT и т.д.

**Как это работает**
- Загруженные файлы будут иметь обновленные метаданные с chatId.
- Это позволит связать файл с chatId.
- При запросе метаданные будут отфильтрованы по chatId для получения файлов, связанных с chatId.
`
