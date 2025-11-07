import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { ListKeyOptions, RecordManagerInterface, UpdateOptions } from '@langchain/community/indexes/base'
import { DataSource } from 'typeorm'
import { getHost, getSSL } from '../../vectorstores/Postgres/utils'
import { getDatabase, getPort, getTableName } from './utils'

const serverCredentialsExists = !!process.env.POSTGRES_RECORDMANAGER_USER && !!process.env.POSTGRES_RECORDMANAGER_PASSWORD

class PostgresRecordManager_RecordManager implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Postgres Менеджер записей'
        this.name = 'postgresRecordManager'
        this.version = 1.0
        this.type = 'Postgres RecordManager'
        this.icon = 'postgres.svg'
        this.category = 'Record Manager'
        this.description = 'Использовать Postgres для отслеживания записи документов в векторные базы данных'
        this.baseClasses = [this.type, 'RecordManager', ...getBaseClasses(PostgresRecordManager)]
        this.inputs = [
            {
                label: 'Хост',
                name: 'host',
                type: 'string',
                placeholder: getHost(),
                optional: !!getHost()
            },
            {
                label: 'База данных',
                name: 'database',
                type: 'string',
                placeholder: getDatabase(),
                optional: !!getDatabase()
            },
            {
                label: 'Порт',
                name: 'port',
                type: 'number',
                placeholder: getPort(),
                optional: true
            },
            {
                label: 'SSL',
                name: 'ssl',
                description: 'Использовать SSL для подключения к Postgres',
                type: 'boolean',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Дополнительная конфигурация подключения',
                name: 'additionalConfig',
                type: 'json',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Название таблицы',
                name: 'tableName',
                type: 'string',
                placeholder: getTableName(),
                additionalParams: true,
                optional: true
            },
            {
                label: 'Пространство имен',
                name: 'namespace',
                type: 'string',
                description: 'Если не указано, будет использован chatflowid',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Очистка',
                name: 'cleanup',
                type: 'options',
                description:
                    'Узнайте больше о различиях между различными методами очистки <a target="_blank" href="https://js.langchain.com/docs/modules/data_connection/indexing/#deletion-modes">здесь</a>',
                options: [
                    {
                        label: 'Нет',
                        name: 'none',
                        description: 'Без очистки старого контента'
                    },
                    {
                        label: 'Инкрементальная',
                        name: 'incremental',
                        description:
                            'Удалить предыдущие версии контента, если содержимое исходного документа изменилось. Важно!! Ключ SourceId должен быть указан, и метаданные документа должны содержать указанный ключ'
                    },
                    {
                        label: 'Полная',
                        name: 'full',
                        description:
                            'То же, что и инкрементальная, но если исходный документ был удален, он также будет удален из векторного хранилища, инкрементальный режим не будет.'
                    }
                ],
                additionalParams: true,
                default: 'none'
            },
            {
                label: 'Ключ SourceId',
                name: 'sourceIdKey',
                type: 'string',
                description:
                    'Ключ, используемый для получения истинного источника документа, для сравнения с записью. Метаданные документа должны содержать ключ SourceId',
                default: 'source',
                placeholder: 'source',
                additionalParams: true,
                optional: true
            }
        ]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['PostgresApi'],
            optional: serverCredentialsExists
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const user = getCredentialParam('user', credentialData, nodeData, process.env.POSTGRES_RECORDMANAGER_USER)
        const password = getCredentialParam('password', credentialData, nodeData, process.env.POSTGRES_RECORDMANAGER_PASSWORD)
        const tableName = getTableName(nodeData)
        const additionalConfig = nodeData.inputs?.additionalConfig as string
        const _namespace = nodeData.inputs?.namespace as string
        const namespace = _namespace ? _namespace : options.chatflowid
        const cleanup = nodeData.inputs?.cleanup as string
        const _sourceIdKey = nodeData.inputs?.sourceIdKey as string
        const sourceIdKey = _sourceIdKey ? _sourceIdKey : 'source'

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
            }
        }

        const postgresConnectionOptions = {
            ...additionalConfiguration,
            type: 'postgres',
            host: getHost(nodeData),
            port: getPort(nodeData),
            ssl: getSSL(nodeData),
            username: user,
            password: password,
            database: getDatabase(nodeData)
        }

        const args = {
            postgresConnectionOptions: postgresConnectionOptions,
            tableName: tableName
        }

        const recordManager = new PostgresRecordManager(namespace, args)

        ;(recordManager as any).cleanup = cleanup
        ;(recordManager as any).sourceIdKey = sourceIdKey

        return recordManager
    }
}

type PostgresRecordManagerOptions = {
    postgresConnectionOptions: any
    tableName: string
}

class PostgresRecordManager implements RecordManagerInterface {
    lc_namespace = ['langchain', 'recordmanagers', 'postgres']
    config: PostgresRecordManagerOptions
    tableName: string
    namespace: string

    constructor(namespace: string, config: PostgresRecordManagerOptions) {
        const { tableName } = config
        this.namespace = namespace
        this.tableName = tableName
        this.config = config
    }

    sanitizeTableName(tableName: string): string {
        // Trim and normalize case, turn whitespace into underscores
        tableName = tableName.trim().toLowerCase().replace(/\s+/g, '_')

        // Validate using a regex (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name')
        }

        return tableName
    }

    private async getDataSource(): Promise<DataSource> {
        const { postgresConnectionOptions } = this.config
        if (!postgresConnectionOptions) {
            throw new Error('No datasource options provided')
        }
        // Prevent using default MySQL port, otherwise will throw uncaught error and crashing the app
        if (postgresConnectionOptions.port === 3006) {
            throw new Error('Invalid port number')
        }
        const dataSource = new DataSource(postgresConnectionOptions)
        await dataSource.initialize()
        return dataSource
    }

    async createSchema(): Promise<void> {
        const dataSource = await this.getDataSource()
        try {
            const queryRunner = dataSource.createQueryRunner()
            const tableName = this.sanitizeTableName(this.tableName)

            await queryRunner.manager.query(`
  CREATE TABLE IF NOT EXISTS "${tableName}" (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    namespace TEXT NOT NULL,
    updated_at Double PRECISION NOT NULL,
    group_id TEXT,
    UNIQUE (key, namespace)
  );
  CREATE INDEX IF NOT EXISTS updated_at_index ON "${tableName}" (updated_at);
  CREATE INDEX IF NOT EXISTS key_index ON "${tableName}" (key);
  CREATE INDEX IF NOT EXISTS namespace_index ON "${tableName}" (namespace);
  CREATE INDEX IF NOT EXISTS group_id_index ON "${tableName}" (group_id);`)

            await queryRunner.release()
        } catch (e: any) {
            // This error indicates that the table already exists
            // Due to asynchronous nature of the code, it is possible that
            // the table is created between the time we check if it exists
            // and the time we try to create it. It can be safely ignored.
            if ('code' in e && e.code === '23505') {
                return
            }
            throw e
        } finally {
            await dataSource.destroy()
        }
    }

    async getTime(): Promise<number> {
        const dataSource = await this.getDataSource()
        try {
            const queryRunner = dataSource.createQueryRunner()
            const res = await queryRunner.manager.query('SELECT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) AS extract')
            await queryRunner.release()
            return Number.parseFloat(res[0].extract)
        } catch (error) {
            console.error('Error getting time in PostgresRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    /**
     * Generates the SQL placeholders for a specific row at the provided index.
     *
     * @param index - The index of the row for which placeholders need to be generated.
     * @param numOfColumns - The number of columns we are inserting data into.
     * @returns The SQL placeholders for the row values.
     */
    private generatePlaceholderForRowAt(index: number, numOfColumns: number): string {
        const placeholders = []
        for (let i = 0; i < numOfColumns; i += 1) {
            placeholders.push(`$${index * numOfColumns + i + 1}`)
        }
        return `(${placeholders.join(', ')})`
    }

    async update(keys: string[], updateOptions?: UpdateOptions): Promise<void> {
        if (keys.length === 0) {
            return
        }

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        const updatedAt = await this.getTime()
        const { timeAtLeast, groupIds: _groupIds } = updateOptions ?? {}

        if (timeAtLeast && updatedAt < timeAtLeast) {
            throw new Error(`Time sync issue with database ${updatedAt} < ${timeAtLeast}`)
        }

        const groupIds = _groupIds ?? keys.map(() => null)

        if (groupIds.length !== keys.length) {
            throw new Error(`Number of keys (${keys.length}) does not match number of group_ids ${groupIds.length})`)
        }

        const recordsToUpsert = keys.map((key, i) => [key, this.namespace, updatedAt, groupIds[i]])

        const valuesPlaceholders = recordsToUpsert.map((_, j) => this.generatePlaceholderForRowAt(j, recordsToUpsert[0].length)).join(', ')

        const query = `INSERT INTO "${tableName}" (key, namespace, updated_at, group_id) VALUES ${valuesPlaceholders} ON CONFLICT (key, namespace) DO UPDATE SET updated_at = EXCLUDED.updated_at;`
        try {
            await queryRunner.manager.query(query, recordsToUpsert.flat())
            await queryRunner.release()
        } catch (error) {
            console.error('Error updating in PostgresRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async exists(keys: string[]): Promise<boolean[]> {
        if (keys.length === 0) {
            return []
        }

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        const startIndex = 2
        const arrayPlaceholders = keys.map((_, i) => `$${i + startIndex}`).join(', ')

        const query = `
        SELECT k, (key is not null) ex from unnest(ARRAY[${arrayPlaceholders}]) k left join "${tableName}" on k=key and namespace = $1;
        `
        try {
            const res = await queryRunner.manager.query(query, [this.namespace, ...keys.flat()])
            await queryRunner.release()
            return res.map((row: { ex: boolean }) => row.ex)
        } catch (error) {
            console.error('Error checking existence of keys in PostgresRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async listKeys(options?: ListKeyOptions): Promise<string[]> {
        const { before, after, limit, groupIds } = options ?? {}
        const tableName = this.sanitizeTableName(this.tableName)

        let query = `SELECT key FROM "${tableName}" WHERE namespace = $1`
        const values: (string | number | (string | null)[])[] = [this.namespace]

        let index = 2
        if (before) {
            values.push(before)
            query += ` AND updated_at < $${index}`
            index += 1
        }

        if (after) {
            values.push(after)
            query += ` AND updated_at > $${index}`
            index += 1
        }

        if (limit) {
            values.push(limit)
            query += ` LIMIT $${index}`
            index += 1
        }

        if (groupIds) {
            values.push(groupIds)
            query += ` AND group_id = ANY($${index})`
            index += 1
        }

        query += ';'

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()

        try {
            const res = await queryRunner.manager.query(query, values)
            await queryRunner.release()
            return res.map((row: { key: string }) => row.key)
        } catch (error) {
            console.error('Error listing keys in PostgresRecordManager:')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }

    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            return
        }

        const dataSource = await this.getDataSource()
        const queryRunner = dataSource.createQueryRunner()
        const tableName = this.sanitizeTableName(this.tableName)

        try {
            const query = `DELETE FROM "${tableName}" WHERE namespace = $1 AND key = ANY($2);`
            await queryRunner.manager.query(query, [this.namespace, keys])
            await queryRunner.release()
        } catch (error) {
            console.error('Error deleting keys')
            throw error
        } finally {
            await dataSource.destroy()
        }
    }
}

module.exports = { nodeClass: PostgresRecordManager_RecordManager }
