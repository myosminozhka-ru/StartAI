import { DataSourceOptions } from 'typeorm/data-source'
import { DataSource } from 'typeorm'
import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { PromptTemplate, PromptTemplateInput } from '@langchain/core/prompts'
import { SqlDatabaseChain, SqlDatabaseChainInput, DEFAULT_SQL_DATABASE_PROMPT } from 'langchain/chains/sql_db'
import { SqlDatabase } from 'langchain/sql_db'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer } from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { getBaseClasses, getInputVariables, transformBracesWithColon } from '../../../src/utils'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'

type DatabaseType = 'sqlite' | 'postgres' | 'mssql' | 'mysql'

class SqlDatabaseChain_Chains implements INode {
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
        this.label = 'Цепочка SQL базы данных'
        this.name = 'sqlDatabaseChain'
        this.version = 5.0
        this.type = 'SqlDatabaseChain'
        this.icon = 'sqlchain.svg'
        this.category = 'Chains'
        this.description = 'Отвечайте на вопросы с помощью базы данных SQL'
        this.baseClasses = [this.type, ...getBaseClasses(SqlDatabaseChain)]
        this.inputs = [
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'База данных',
                name: 'database',
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
                        label: 'MSSQL',
                        name: 'mssql'
                    },
                    {
                        label: 'MySQL',
                        name: 'mysql'
                    }
                ],
                default: 'sqlite'
            },
            {
                label: 'Строка подключения или путь к файлу (только для sqlite)',
                name: 'url',
                type: 'string',
                placeholder: '127.0.0.1:5432/chinook'
            },
            {
                label: 'Включить таблицы',
                name: 'includesTables',
                type: 'string',
                description:
                    'Таблицы для включения в запросы, разделенные запятыми. Можно использовать только Включить таблицы или Игнорировать таблицы',
                placeholder: 'table1, table2',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Игнорировать таблицы',
                name: 'ignoreTables',
                type: 'string',
                description:
                    'Таблицы для исключения из запросов, разделенные запятыми. Можно использовать только Игнорировать таблицы или Включить таблицы',
                placeholder: 'table1, table2',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Информация о примерах строк таблицы',
                name: 'sampleRowsInTableInfo',
                type: 'number',
                description: 'Количество примеров строк для загрузки информации о таблицах.',
                placeholder: '3',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Топ ключей',
                name: 'topK',
                type: 'number',
                description:
                    'Если вы запрашиваете несколько строк таблицы, вы можете выбрать максимальное количество результатов, которое хотите получить, используя параметр "top_k" (по умолчанию 10). Это полезно для избежания результатов запроса, превышающих максимальную длину промпта или потребляющих токены без необходимости.',
                placeholder: '10',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Пользовательский промпт',
                name: 'customPrompt',
                type: 'string',
                description:
                    'Вы можете предоставить пользовательский промпт для цепочки. Это переопределит существующий промпт по умолчанию. См. <a target="_blank" href="https://python.langchain.com/docs/integrations/tools/sqlite#customize-prompt">руководство</a>',
                warning:
                    'Промпт должен включать 3 входные переменные: {input}, {dialect}, {table_info}. Вы можете обратиться к официальному руководству из описания выше',
                rows: 4,
                placeholder: DEFAULT_SQL_DATABASE_PROMPT.template + DEFAULT_SQL_DATABASE_PROMPT.templateFormat,
                additionalParams: true,
                optional: true
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки языковой модели',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const databaseType = nodeData.inputs?.database as DatabaseType
        const model = nodeData.inputs?.model as BaseLanguageModel
        const url = nodeData.inputs?.url as string
        const includesTables = nodeData.inputs?.includesTables
        const splittedIncludesTables = includesTables == '' ? undefined : includesTables?.split(',')
        const ignoreTables = nodeData.inputs?.ignoreTables
        const splittedIgnoreTables = ignoreTables == '' ? undefined : ignoreTables?.split(',')
        const sampleRowsInTableInfo = nodeData.inputs?.sampleRowsInTableInfo as number
        const topK = nodeData.inputs?.topK as number
        const customPrompt = nodeData.inputs?.customPrompt as string

        const chain = await getSQLDBChain(
            databaseType,
            url,
            model,
            splittedIncludesTables,
            splittedIgnoreTables,
            sampleRowsInTableInfo,
            topK,
            customPrompt
        )
        return chain
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const databaseType = nodeData.inputs?.database as DatabaseType
        const model = nodeData.inputs?.model as BaseLanguageModel
        const url = nodeData.inputs?.url as string
        const includesTables = nodeData.inputs?.includesTables
        const splittedIncludesTables = includesTables == '' ? undefined : includesTables?.split(',')
        const ignoreTables = nodeData.inputs?.ignoreTables
        const splittedIgnoreTables = ignoreTables == '' ? undefined : ignoreTables?.split(',')
        const sampleRowsInTableInfo = nodeData.inputs?.sampleRowsInTableInfo as number
        const topK = nodeData.inputs?.topK as number
        const customPrompt = nodeData.inputs?.customPrompt as string
        const moderations = nodeData.inputs?.inputModeration as Moderation[]

        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the Sql Database Chain
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                if (shouldStreamResponse) {
                    streamResponse(sseStreamer, chatId, e.message)
                }
                return formatResponse(e.message)
            }
        }

        const chain = await getSQLDBChain(
            databaseType,
            url,
            model,
            splittedIncludesTables,
            splittedIgnoreTables,
            sampleRowsInTableInfo,
            topK,
            customPrompt
        )
        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const callbacks = await additionalCallbacks(nodeData, options)

        if (shouldStreamResponse) {
            const handler = new CustomChainHandler(sseStreamer, chatId, 2)

            const res = await chain.run(input, [loggerHandler, handler, ...callbacks])
            return res
        } else {
            const res = await chain.run(input, [loggerHandler, ...callbacks])
            return res
        }
    }
}

const getSQLDBChain = async (
    databaseType: DatabaseType,
    url: string,
    llm: BaseLanguageModel,
    includesTables?: string[],
    ignoreTables?: string[],
    sampleRowsInTableInfo?: number,
    topK?: number,
    customPrompt?: string
) => {
    const datasource = new DataSource(
        databaseType === 'sqlite'
            ? {
                  type: databaseType,
                  database: url
              }
            : ({
                  type: databaseType,
                  url: url
              } as DataSourceOptions)
    )

    const db = await SqlDatabase.fromDataSourceParams({
        appDataSource: datasource,
        includesTables: includesTables,
        ignoreTables: ignoreTables,
        sampleRowsInTableInfo: sampleRowsInTableInfo
    })

    const obj: SqlDatabaseChainInput = {
        llm,
        database: db,
        verbose: process.env.DEBUG === 'true',
        topK: topK
    }

    if (customPrompt) {
        customPrompt = transformBracesWithColon(customPrompt)
        const options: PromptTemplateInput = {
            template: customPrompt,
            inputVariables: getInputVariables(customPrompt)
        }
        obj.prompt = new PromptTemplate(options)
    }

    const chain = new SqlDatabaseChain(obj)
    return chain
}

module.exports = { nodeClass: SqlDatabaseChain_Chains }
