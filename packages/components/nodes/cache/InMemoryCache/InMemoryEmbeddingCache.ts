import { Embeddings } from '@langchain/core/embeddings'
import { BaseStore } from '@langchain/core/stores'
import { CacheBackedEmbeddings } from 'langchain/embeddings/cache_backed'
import { getBaseClasses, ICommonObject, INode, INodeData, INodeParams } from '../../../src'

class InMemoryEmbeddingCache implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Кэш эмбеддингов в памяти'
        this.name = 'inMemoryEmbeddingCache'
        this.version = 1.0
        this.type = 'InMemoryEmbeddingCache'
        this.description = 'Кэширование сгенерированных эмбеддингов в памяти для избежания необходимости их повторного вычисления.'
        this.icon = 'Memory.svg'
        this.category = 'Cache'
        this.baseClasses = [this.type, ...getBaseClasses(CacheBackedEmbeddings)]
        this.inputs = [
            {
                label: 'Эмбеддинги',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Пространство имен',
                name: 'namespace',
                type: 'string',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const namespace = nodeData.inputs?.namespace as string
        const underlyingEmbeddings = nodeData.inputs?.embeddings as Embeddings
        const memoryMap = (await options.cachePool.getEmbeddingCache(options.chatflowid)) ?? {}
        const inMemCache = new InMemoryEmbeddingCacheExtended(memoryMap)

        inMemCache.mget = async (keys: string[]) => {
            const memory = (await options.cachePool.getEmbeddingCache(options.chatflowid)) ?? inMemCache.store
            return keys.map((key) => memory[key])
        }

        inMemCache.mset = async (keyValuePairs: [string, any][]): Promise<void> => {
            for (const [key, value] of keyValuePairs) {
                inMemCache.store[key] = value
            }
            await options.cachePool.addEmbeddingCache(options.chatflowid, inMemCache.store)
        }

        inMemCache.mdelete = async (keys: string[]): Promise<void> => {
            for (const key of keys) {
                delete inMemCache.store[key]
            }
            await options.cachePool.addEmbeddingCache(options.chatflowid, inMemCache.store)
        }

        return CacheBackedEmbeddings.fromBytesStore(underlyingEmbeddings, inMemCache, {
            namespace: namespace
        })
    }
}

class InMemoryEmbeddingCacheExtended<T = any> extends BaseStore<string, T> {
    lc_namespace = ['langchain', 'storage', 'in_memory']

    store: Record<string, T> = {}

    constructor(map: Record<string, T>) {
        super()
        this.store = map
    }

    /**
     * Получает значения, связанные с указанными ключами из хранилища.
     * @param keys Ключи, для которых нужно получить значения.
     * @returns Массив значений, связанных с указанными ключами.
     */
    async mget(keys: string[]) {
        return keys.map((key) => this.store[key])
    }

    /**
     * Устанавливает значения для указанных ключей в хранилище.
     * @param keyValuePairs Массив пар ключ-значение для установки в хранилище.
     * @returns Promise, который разрешается, когда все пары ключ-значение установлены.
     */
    async mset(keyValuePairs: [string, T][]): Promise<void> {
        for (const [key, value] of keyValuePairs) {
            this.store[key] = value
        }
    }

    /**
     * Удаляет указанные ключи и их связанные значения из хранилища.
     * @param keys Ключи для удаления из хранилища.
     * @returns Promise, который разрешается, когда все ключи удалены.
     */
    async mdelete(keys: string[]): Promise<void> {
        for (const key of keys) {
            delete this.store[key]
        }
    }

    /**
     * Асинхронный генератор, который выдает ключи из хранилища. Если указан префикс,
     * он выдает только ключи, начинающиеся с этого префикса.
     * @param prefix Опциональный префикс для фильтрации ключей.
     * @returns AsyncGenerator, который выдает ключи из хранилища.
     */
    async *yieldKeys(prefix?: string | undefined): AsyncGenerator<string> {
        const keys = Object.keys(this.store)
        for (const key of keys) {
            if (prefix === undefined || key.startsWith(prefix)) {
                yield key
            }
        }
    }
}

module.exports = { nodeClass: InMemoryEmbeddingCache }
