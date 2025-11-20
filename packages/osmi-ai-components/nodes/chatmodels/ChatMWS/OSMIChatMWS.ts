import { ChatOpenAI as LangchainChatOpenAI, ChatOpenAIFields } from '@langchain/openai'
import { IMultiModalOption, IVisionChatModal } from '../../../src'

export class ChatMWS extends LangchainChatOpenAI implements IVisionChatModal {
    configuredModel: string
    configuredMaxToken?: number
    multiModalOption: IMultiModalOption
    builtInTools: Record<string, any>[] = []
    id: string

    constructor(id: string, fields?: ChatOpenAIFields) {
        if (!fields?.apiKey && !fields?.openAIApiKey) {
            throw new Error('MWS API Key отсутствует. Добавьте credential.')
        }
        
        const mwsFields: ChatOpenAIFields = {
            ...fields,
            apiKey: fields?.apiKey || fields?.openAIApiKey,
            configuration: {
                ...fields?.configuration,
                baseURL: 'https://api.gpt.mws.ru/v1'
            }
        }
        super(mwsFields)
        this.id = id
        this.configuredModel = fields?.modelName ?? ''
        this.configuredMaxToken = fields?.maxTokens
    }

    revertToOriginalModel(): void {
        this.model = this.configuredModel
        this.maxTokens = this.configuredMaxToken
    }

    setMultiModalOption(multiModalOption: IMultiModalOption): void {
        this.multiModalOption = multiModalOption
    }

    setVisionModel(): void {
        // pass
    }

    addBuiltInTools(builtInTool: Record<string, any>): void {
        this.builtInTools.push(builtInTool)
    }
}
