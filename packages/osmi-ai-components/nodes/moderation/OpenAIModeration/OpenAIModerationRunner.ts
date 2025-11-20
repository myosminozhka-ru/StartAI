import { Moderation } from '../Moderation'
import { OpenAIModerationChain } from 'langchain/chains'
import { attachOpenAIApiKey } from '../../../src/utils'

export class OpenAIModerationRunner implements Moderation {
    private openAIApiKey = ''
    private moderationErrorMessage: string = "Text was found that violates OpenAI's content policy."

    constructor(openAIApiKey: string) {
        this.openAIApiKey = openAIApiKey
    }

    async checkForViolations(input: string): Promise<string> {
        if (!this.openAIApiKey) {
            throw Error('OpenAI API key not found')
        }
        // Create a new instance of the OpenAIModerationChain
        const moderationConfig: Record<string, any> = {
            throwError: false // If set to true, the call will throw an error when the moderation chain detects violating content. If set to false, violating content will return "Text was found that violates OpenAI's content policy.".
        }
        attachOpenAIApiKey(moderationConfig, this.openAIApiKey)
        const moderation = new OpenAIModerationChain(moderationConfig)
        // Send the user's input to the moderation chain and wait for the result
        const { output: moderationOutput, results } = await moderation.call({
            input: input
        })
        if (results[0].flagged) {
            throw Error(this.moderationErrorMessage)
        }
        return moderationOutput
    }

    setErrorMessage(message: string) {
        this.moderationErrorMessage = message
    }
}
