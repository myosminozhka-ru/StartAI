import path from 'path'
import { getBaseClasses, getCredentialData, getCredentialParam, getUserHome } from '../../../src/utils'
import { SaverOptions } from './interface'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeParams } from '../../../src/Interface'
import { SqliteSaver } from './SQLiteAgentMemory/sqliteSaver'
import { DataSource } from 'typeorm'
import { PostgresSaver } from './PostgresAgentMemory/pgSaver'
import { MySQLSaver } from './MySQLAgentMemory/mysqlSaver'

class AgentMemory_Memory implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Память агента'
        this.name = 'agentMemory'
        this.version = 2.0
        this.type = 'AgentMemory'
        this.icon = 'agentmemory.svg'
        this.category = 'Memory'
        this.description = 'Память для agentflow для запоминания состояния разговора'
        this.baseClasses = [this.type, ...getBaseClasses(SqliteSaver)]
        this.badge = 'DEPRECATING'
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['PostgresApi', 'MySQLApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'База данных',
                name: 'databaseType',
                type: 'options',
                options: [
                    {
                        label: 'SQLite',
                        name: 'sqlite'
                    },
                    {
                        label: 'PostgreSQL',
                        name: 'postgres'
                    },
                    {
                        label: 'MySQL',
                        name: 'mysql'
                    }
                ],
                default: 'sqlite'
            },
            {
                label: 'Путь к файлу базы данных',
                name: 'databaseFilePath',
                type: 'string',
                placeholder: 'C:\\Users\\User\\.OSMI\\database.sqlite',
                description:
                    'Если выбран SQLite, укажите путь к файлу базы данных SQLite. Оставьте пустым для использования базы данных приложения по умолчанию',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Хост',
                name: 'host',
                type: 'string',
                description: 'Если выбран PostgresQL/MySQL, укажите хост базы данных',
                additionalParams: true,
                optional: true
            },
            {
                label: 'База данных',
                name: 'database',
                type: 'string',
                description: 'Если выбран PostgresQL/MySQL, укажите название базы данных',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Порт',
                name: 'port',
                type: 'number',
                description: 'Если выбран PostgresQL/MySQL, укажите порт базы данных',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Дополнительная конфигурация подключения',
                name: 'additionalConfig',
                type: 'json',
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const additionalConfig = nodeData.inputs?.additionalConfig as string
        const databaseFilePath = nodeData.inputs?.databaseFilePath as string
        const databaseType = nodeData.inputs?.databaseType as string
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        const chatflowid = options.chatflowid as string
        const orgId = options.orgId as string
        const appDataSource = options.appDataSource as DataSource

        let additionalConfiguration = {}
        if (additionalConfig) {
            try {
                additionalConfiguration = typeof additionalConfig === 'object' ? additionalConfig : JSON.parse(additionalConfig)
            } catch (exception) {
                throw new Error('Invalid JSON in the Additional Configuration: ' + exception)
            }
        }

        const threadId = options.sessionId || options.chatId

        let datasourceOptions: ICommonObject = {
            ...additionalConfiguration,
            type: databaseType
        }

        if (databaseType === 'sqlite') {
            datasourceOptions.database = databaseFilePath
                ? path.resolve(databaseFilePath)
                : path.join(process.env.DATABASE_PATH ?? path.join(getUserHome(), '.OSMI'), 'database.sqlite')
            const args: SaverOptions = {
                datasourceOptions,
                threadId,
                appDataSource,
                databaseEntities,
                chatflowid,
                orgId
            }
            const recordManager = new SqliteSaver(args)
            return recordManager
        } else if (databaseType === 'postgres') {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const user = getCredentialParam('user', credentialData, nodeData)
            const password = getCredentialParam('password', credentialData, nodeData)
            const _port = (nodeData.inputs?.port as string) || '5432'
            const port = parseInt(_port)
            datasourceOptions = {
                ...datasourceOptions,
                host: nodeData.inputs?.host as string,
                port,
                database: nodeData.inputs?.database as string,
                username: user,
                user: user,
                password: password
            }
            const args: SaverOptions = {
                datasourceOptions,
                threadId,
                appDataSource,
                databaseEntities,
                chatflowid,
                orgId
            }
            const recordManager = new PostgresSaver(args)
            return recordManager
        } else if (databaseType === 'mysql') {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const user = getCredentialParam('user', credentialData, nodeData)
            const password = getCredentialParam('password', credentialData, nodeData)
            const _port = (nodeData.inputs?.port as string) || '3306'
            const port = parseInt(_port)
            datasourceOptions = {
                ...datasourceOptions,
                host: nodeData.inputs?.host as string,
                port,
                database: nodeData.inputs?.database as string,
                username: user,
                user: user,
                password: password,
                charset: 'utf8mb4'
            }
            const args: SaverOptions = {
                datasourceOptions,
                threadId,
                appDataSource,
                databaseEntities,
                chatflowid,
                orgId
            }
            const recordManager = new MySQLSaver(args)
            return recordManager
        }

        return undefined
    }
}

module.exports = { nodeClass: AgentMemory_Memory }
