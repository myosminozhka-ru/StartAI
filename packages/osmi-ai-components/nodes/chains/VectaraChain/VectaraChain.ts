import fetch from 'node-fetch'
import { Document } from '@langchain/core/documents'
import { VectaraStore } from '@langchain/community/vectorstores/vectara'
import { VectorDBQAChain } from 'langchain/chains'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

// functionality based on https://github.com/vectara/vectara-answer
const reorderCitations = (unorderedSummary: string) => {
    const allCitations = unorderedSummary.match(/\[\d+\]/g) || []

    const uniqueCitations = [...new Set(allCitations)]
    const citationToReplacement: { [key: string]: string } = {}
    uniqueCitations.forEach((citation, index) => {
        citationToReplacement[citation] = `[${index + 1}]`
    })

    return unorderedSummary.replace(/\[\d+\]/g, (match) => citationToReplacement[match])
}
const applyCitationOrder = (searchResults: any[], unorderedSummary: string) => {
    const orderedSearchResults: any[] = []
    const allCitations = unorderedSummary.match(/\[\d+\]/g) || []

    const addedIndices = new Set<number>()
    for (let i = 0; i < allCitations.length; i++) {
        const citation = allCitations[i]
        const index = Number(citation.slice(1, citation.length - 1)) - 1

        if (addedIndices.has(index)) continue
        orderedSearchResults.push(searchResults[index])
        addedIndices.add(index)
    }

    return orderedSearchResults
}

class VectaraChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Цепочка вопросов-ответов Vectara'
        this.name = 'vectaraQAChain'
        this.version = 2.0
        this.type = 'VectaraQAChain'
        this.icon = 'vectara.png'
        this.category = 'Chains'
        this.description = 'Цепочка вопросов-ответов для Vectara'
        this.baseClasses = [this.type, ...getBaseClasses(VectorDBQAChain)]
        this.inputs = [
            {
                label: 'Хранилище Vectara',
                name: 'vectaraStore',
                type: 'VectorStore'
            },
            {
                label: 'Название промпта суммаризации',
                name: 'summarizerPromptName',
                description:
                    'Суммаризация результатов, полученных из Vectara. Подробнее <a target="_blank" href="https://docs.vectara.com/docs/learn/grounded-generation/select-a-summarizer">здесь</a>',
                type: 'options',
                options: [
                    {
                        label: 'vectara-summary-ext-v1.2.0 (gpt-3.5-turbo)',
                        name: 'vectara-summary-ext-v1.2.0',
                        description: 'базовый суммаризатор, доступен всем пользователям Vectara'
                    },
                    {
                        label: 'vectara-experimental-summary-ext-2023-10-23-small (gpt-3.5-turbo)',
                        name: 'vectara-experimental-summary-ext-2023-10-23-small',
                        description: `В бета-версии, доступен пользователям Vectara уровня Growth и <a target="_blank" href="https://vectara.com/pricing/">Scale</a>`
                    },
                    {
                        label: 'vectara-summary-ext-v1.3.0 (gpt-4.0)',
                        name: 'vectara-summary-ext-v1.3.0',
                        description:
                            'Доступен только пользователям Vectara уровня <a target="_blank" href="https://vectara.com/pricing/">Scale</a>'
                    },
                    {
                        label: 'vectara-experimental-summary-ext-2023-10-23-med (gpt-4.0)',
                        name: 'vectara-experimental-summary-ext-2023-10-23-med',
                        description: `В бета-версии, доступен только пользователям Vectara уровня <a target="_blank" href="https://vectara.com/pricing/">Scale</a>`
                    }
                ],
                default: 'vectara-summary-ext-v1.2.0'
            },
            {
                label: 'Язык ответа',
                name: 'responseLang',
                description:
                    'Возвращает ответ на указанном языке. Если не выбран, Vectara автоматически определит язык. Подробнее <a target="_blank" href="https://docs.vectara.com/docs/learn/grounded-generation/grounded-generation-response-languages">здесь</a>',
                type: 'options',
                options: [
                    {
                        label: 'Английский',
                        name: 'eng'
                    },
                    {
                        label: 'Немецкий',
                        name: 'deu'
                    },
                    {
                        label: 'Французский',
                        name: 'fra'
                    },
                    {
                        label: 'Китайский',
                        name: 'zho'
                    },
                    {
                        label: 'Корейский',
                        name: 'kor'
                    },
                    {
                        label: 'Арабский',
                        name: 'ara'
                    },
                    {
                        label: 'Русский',
                        name: 'rus'
                    },
                    {
                        label: 'Тайский',
                        name: 'tha'
                    },
                    {
                        label: 'Голландский',
                        name: 'nld'
                    },
                    {
                        label: 'Итальянский',
                        name: 'ita'
                    },
                    {
                        label: 'Португальский',
                        name: 'por'
                    },
                    {
                        label: 'Испанский',
                        name: 'spa'
                    },
                    {
                        label: 'Японский',
                        name: 'jpn'
                    },
                    {
                        label: 'Польский',
                        name: 'pol'
                    },
                    {
                        label: 'Турецкий',
                        name: 'tur'
                    },
                    {
                        label: 'Вьетнамский',
                        name: 'vie'
                    },
                    {
                        label: 'Индонезийский',
                        name: 'ind'
                    },
                    {
                        label: 'Чешский',
                        name: 'ces'
                    },
                    {
                        label: 'Украинский',
                        name: 'ukr'
                    },
                    {
                        label: 'Греческий',
                        name: 'ell'
                    },
                    {
                        label: 'Иврит',
                        name: 'heb'
                    },
                    {
                        label: 'Фарси/Персидский',
                        name: 'fas'
                    },
                    {
                        label: 'Хинди',
                        name: 'hin'
                    },
                    {
                        label: 'Урду',
                        name: 'urd'
                    },
                    {
                        label: 'Шведский',
                        name: 'swe'
                    },
                    {
                        label: 'Бенгальский',
                        name: 'ben'
                    },
                    {
                        label: 'Малайский',
                        name: 'msa'
                    },
                    {
                        label: 'Румынский',
                        name: 'ron'
                    }
                ],
                optional: true,
                default: 'eng'
            },
            {
                label: 'Максимальное количество результатов для суммаризации',
                name: 'maxSummarizedResults',
                description: 'Максимальное количество результатов, используемых для построения суммаризированного ответа',
                type: 'number',
                default: 7
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки в языковую модель',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string): Promise<string | object> {
        const vectorStore = nodeData.inputs?.vectaraStore as VectaraStore
        const responseLang = (nodeData.inputs?.responseLang as string) ?? 'eng'
        const summarizerPromptName = nodeData.inputs?.summarizerPromptName as string
        const maxSummarizedResultsStr = nodeData.inputs?.maxSummarizedResults as string
        const maxSummarizedResults = maxSummarizedResultsStr ? parseInt(maxSummarizedResultsStr, 10) : 7

        const topK = (vectorStore as any)?.k ?? 10

        const headers = await vectorStore.getJsonHeader()
        const vectaraFilter = (vectorStore as any).vectaraFilter ?? {}
        const corpusId: number[] = (vectorStore as any).corpusId ?? []
        const customerId = (vectorStore as any).customerId ?? ''

        const corpusKeys = corpusId.map((corpusId) => ({
            customerId,
            corpusId,
            metadataFilter: vectaraFilter?.filter ?? '',
            lexicalInterpolationConfig: { lambda: vectaraFilter?.lambda ?? 0.025 }
        }))

        // Vectara reranker ID for MMR (https://docs.vectara.com/docs/api-reference/search-apis/reranking#maximal-marginal-relevance-mmr-reranker)
        const mmrRerankerId = 272725718
        const mmrEnabled = vectaraFilter?.mmrConfig?.enabled

        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the Vectara chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                // if (options.shouldStreamResponse) {
                //     streamResponse(options.sseStreamer, options.chatId, e.message)
                // }
                return formatResponse(e.message)
            }
        }

        const data = {
            query: [
                {
                    query: input,
                    start: 0,
                    numResults: mmrEnabled ? vectaraFilter?.mmrTopK : topK,
                    corpusKey: corpusKeys,
                    contextConfig: {
                        sentencesAfter: vectaraFilter?.contextConfig?.sentencesAfter ?? 2,
                        sentencesBefore: vectaraFilter?.contextConfig?.sentencesBefore ?? 2
                    },
                    ...(mmrEnabled
                        ? {
                              rerankingConfig: {
                                  rerankerId: mmrRerankerId,
                                  mmrConfig: {
                                      diversityBias: vectaraFilter?.mmrConfig.diversityBias
                                  }
                              }
                          }
                        : {}),
                    summary: [
                        {
                            summarizerPromptName,
                            responseLang,
                            maxSummarizedResults
                        }
                    ]
                }
            ]
        }

        try {
            const response = await fetch(`https://api.vectara.io/v1/query`, {
                method: 'POST',
                headers: headers?.headers,
                body: JSON.stringify(data)
            })

            if (response.status !== 200) {
                throw new Error(`Vectara API returned status code ${response.status}`)
            }

            const result = await response.json()
            const responses = result.responseSet[0].response
            const documents = result.responseSet[0].document
            let rawSummarizedText = ''

            // remove responses that are not in the topK (in case of MMR)
            // Note that this does not really matter functionally due to the reorder citations, but it is more efficient
            const maxResponses = mmrEnabled ? Math.min(responses.length, topK) : responses.length
            if (responses.length > maxResponses) {
                responses.splice(0, maxResponses)
            }

            // Add metadata to each text response given its corresponding document metadata
            for (let i = 0; i < responses.length; i += 1) {
                const responseMetadata = responses[i].metadata
                const documentMetadata = documents[responses[i].documentIndex].metadata
                const combinedMetadata: Record<string, unknown> = {}

                responseMetadata.forEach((item: { name: string; value: unknown }) => {
                    combinedMetadata[item.name] = item.value
                })

                documentMetadata.forEach((item: { name: string; value: unknown }) => {
                    combinedMetadata[item.name] = item.value
                })

                responses[i].metadata = combinedMetadata
            }

            // Create the summarization response
            const summaryStatus = result.responseSet[0].summary[0].status
            if (summaryStatus.length > 0 && summaryStatus[0].code === 'BAD_REQUEST') {
                throw new Error(
                    `BAD REQUEST: Too much text for the summarizer to summarize. Please try reducing the number of search results to summarize, or the context of each result by adjusting the 'summary_num_sentences', and 'summary_num_results' parameters respectively.`
                )
            }
            if (
                summaryStatus.length > 0 &&
                summaryStatus[0].code === 'NOT_FOUND' &&
                summaryStatus[0].statusDetail === 'Failed to retrieve summarizer.'
            ) {
                throw new Error(`BAD REQUEST: summarizer ${summarizerPromptName} is invalid for this account.`)
            }

            // Reorder citations in summary and create the list of returned source documents
            rawSummarizedText = result.responseSet[0].summary[0]?.text
            let summarizedText = reorderCitations(rawSummarizedText)
            let summaryResponses = applyCitationOrder(responses, rawSummarizedText)

            const sourceDocuments: Document[] = summaryResponses.map(
                (response: { text: string; metadata: Record<string, unknown>; score: number }) =>
                    new Document({
                        pageContent: response.text,
                        metadata: response.metadata
                    })
            )

            return { text: summarizedText, sourceDocuments: sourceDocuments }
        } catch (error) {
            throw new Error(error)
        }
    }
}

module.exports = { nodeClass: VectaraChain_Chains }
