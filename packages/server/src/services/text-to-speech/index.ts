import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalOsmiError } from '../../errors/InternalOsmiError'
import { getErrorMessage } from '../../errors/utils'
import { getVoices } from 'osmi-ai-components'
import { databaseEntities } from '../../utils'

export enum TextToSpeechProvider {
    OPENAI = 'openai',
    ELEVEN_LABS = 'elevenlabs'
}

export interface TTSRequest {
    text: string
    provider: TextToSpeechProvider
    credentialId: string
    voice?: string
    model?: string
}

export interface TTSResponse {
    audioBuffer: Buffer
    contentType: string
}

const getVoicesForProvider = async (provider: string, credentialId?: string): Promise<any[]> => {
    try {
        if (!credentialId) {
            throw new InternalOsmiError(StatusCodes.BAD_REQUEST, 'Credential ID required for this provider')
        }

        const appServer = getRunningExpressApp()
        const options = {
            orgId: '',
            chatflowid: '',
            chatId: '',
            appDataSource: appServer.AppDataSource,
            databaseEntities: databaseEntities
        }

        return await getVoices(provider, credentialId, options)
    } catch (error) {
        throw new InternalOsmiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: textToSpeechService.getVoices - ${getErrorMessage(error)}`)
    }
}

export default {
    getVoices: getVoicesForProvider
}
