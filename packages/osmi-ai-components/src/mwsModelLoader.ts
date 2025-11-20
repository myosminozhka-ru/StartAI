import axios from 'axios'
import { INodeOptionsValue } from './Interface'

/**
 * Получить список доступных моделей от MWS API
 * @param apiKey - API ключ MWS
 * @returns Promise с массивом моделей
 */
export const getMWSModels = async (apiKey: string): Promise<INodeOptionsValue[]> => {
    try {
        const response = await axios.get('https://api.gpt.mws.ru/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 секунд таймаут
        })

        if (response.status === 200 && response.data && response.data.data) {
            return response.data.data.map((model: any) => ({
                label: model.id,
                name: model.id,
                description: model.description || `Модель ${model.id} через MWS API`
            }))
        } else {
            throw new Error('Неверный ответ от MWS API')
        }
    } catch (error) {
        console.warn('Ошибка при загрузке моделей MWS:', error)
        // Возвращаем дефолтные модели в случае ошибки
        return getDefaultMWSModels()
    }
}

/**
 * Получить дефолтные модели MWS (fallback)
 */
export const getDefaultMWSModels = (): INodeOptionsValue[] => {
    return [
        {
            label: 'MWS GPT Alpha',
            name: 'mws-gpt-alpha',
            description: 'MWS GPT Alpha - основная модель MWS'
        },
        {
            label: 'Qwen 2.5 32B Instruct',
            name: 'qwen2.5-32b-instruct',
            description: 'Qwen 2.5 32B Instruct через MWS API'
        },
        {
            label: 'Llama 3.3 70B Instruct',
            name: 'llama-3.3-70b-instruct',
            description: 'Llama 3.3 70B Instruct через MWS API'
        },
        {
            label: 'Llama 3.1 8B Instruct',
            name: 'llama-3.1-8b-instruct',
            description: 'Llama 3.1 8B Instruct через MWS API'
        },
        {
            label: 'Qwen 2.5 72B Instruct',
            name: 'qwen2.5-72b-instruct',
            description: 'Qwen 2.5 72B Instruct через MWS API'
        },
        {
            label: 'Gemma 3 27B IT',
            name: 'gemma-3-27b-it',
            description: 'Gemma 3 27B IT через MWS API'
        },
        {
            label: 'DeepSeek R1 Distill Qwen 32B',
            name: 'deepseek-r1-distill-qwen-32b',
            description: 'DeepSeek R1 Distill Qwen 32B через MWS API'
        },
        {
            label: 'Qwen 2.5 Coder 7B Instruct',
            name: 'qwen2.5-coder-7b-instruct',
            description: 'Qwen 2.5 Coder 7B Instruct через MWS API'
        },
        {
            label: 'Cotype 2 Pro',
            name: 'cotype-2-pro',
            description: 'Cotype 2 Pro через MWS API'
        }
    ]
}

/**
 * Получить дефолтные модели эмбеддингов MWS
 */
export const getDefaultMWSEmbeddingModels = (): INodeOptionsValue[] => {
    return [
        {
            label: 'BGE M3',
            name: 'bge-m3',
            description: 'BGE M3 - многоязычная embedding модель через MWS API'
        },
        {
            label: 'Cotype 2 Pro',
            name: 'cotype-2-pro',
            description: 'Cotype 2 Pro embedding модель через MWS API'
        }
    ]
}
