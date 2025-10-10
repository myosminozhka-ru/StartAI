import { BaseLanguageModel } from '@langchain/core/language_models/base'
import { AgentExecutor } from 'langchain/agents'
import { LLMChain } from 'langchain/chains'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { ICommonObject, INode, INodeData, INodeParams, IServerSideEventStreamer, PromptTemplate } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { LoadPyodide, finalSystemPrompt, systemPrompt } from './core'
import { checkInputs, Moderation } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { getFileFromStorage } from '../../../src'

class CSV_Agents implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'CSV Agent'
        this.name = 'csvAgent'
        this.version = 3.0
        this.type = 'AgentExecutor'
        this.category = 'Agents'
        this.icon = 'CSVagent.svg'
        this.description = 'Агент, используемый для ответов на запросы по данным CSV'
        this.baseClasses = [this.type, ...getBaseClasses(AgentExecutor)]
        this.inputs = [
            {
                label: 'CSV файл',
                name: 'csvFile',
                type: 'file',
                fileType: '.csv'
            },
            {
                label: 'Языковая модель',
                name: 'model',
                type: 'BaseLanguageModel'
            },
            {
                label: 'Системное сообщение',
                name: 'systemMessagePrompt',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder:
                    'Я хочу, чтобы вы действовали как документ, с которым я веду беседу. Ваше имя - "AI Assistant". Вы будете предоставлять мне ответы из данной информации. Если ответ не включен, скажите точно "Хм, я не уверен." и остановитесь на этом. Откажитесь отвечать на любой вопрос не о предоставленной информации. Никогда не выходите из роли.'
            },
            {
                label: 'Модерация ввода',
                description:
                    'Обнаружение текста, который может генерировать вредоносный вывод, и предотвращение его отправки в языковую модель',
                name: 'inputModeration',
                type: 'Moderation',
                optional: true,
                list: true
            },
            {
                label: 'Пользовательский код Pandas Read_CSV',
                description:
                    'Пользовательская функция Pandas <a target="_blank" href="https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.read_csv.html">read_csv</a>. Принимает входной параметр: "csv_data"',
                name: 'customReadCSV',
                default: 'read_csv(csv_data)',
                type: 'code',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(): Promise<any> {
        // Not used
        return undefined
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<string | object> {
        const csvFileBase64 = nodeData.inputs?.csvFile as string
        const model = nodeData.inputs?.model as BaseLanguageModel
        const systemMessagePrompt = nodeData.inputs?.systemMessagePrompt as string
        const moderations = nodeData.inputs?.inputModeration as Moderation[]
        const _customReadCSV = nodeData.inputs?.customReadCSV as string

        if (moderations && moderations.length > 0) {
            try {
                // Use the output of the moderation chain as input for the CSV agent
                input = await checkInputs(moderations, input)
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                // if (options.shouldStreamResponse) {
                //     streamResponse(options.sseStreamer, options.chatId, e.message)
                // }
                return formatResponse(e.message)
            }
        }

        const loggerHandler = new ConsoleCallbackHandler(options.logger, options?.orgId)
        const shouldStreamResponse = options.shouldStreamResponse
        const sseStreamer: IServerSideEventStreamer = options.sseStreamer as IServerSideEventStreamer
        const chatId = options.chatId

        const callbacks = await additionalCallbacks(nodeData, options)

        let files: string[] = []
        let base64String = ''

        if (csvFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = csvFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const orgId = options.orgId
            const chatflowid = options.chatflowid

            for (const file of files) {
                if (!file) continue
                const fileData = await getFileFromStorage(file, orgId, chatflowid)
                base64String += fileData.toString('base64')
            }
        } else {
            if (csvFileBase64.startsWith('[') && csvFileBase64.endsWith(']')) {
                files = JSON.parse(csvFileBase64)
            } else {
                files = [csvFileBase64]
            }

            for (const file of files) {
                if (!file) continue
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                base64String += splitDataURI.pop() ?? ''
            }
        }

        const pyodide = await LoadPyodide()

        // Сначала загружаем csv файл и получаем словарь типов столбцов dataframe
        // Например, используя titanic.csv: {'PassengerId': 'int64', 'Survived': 'int64', 'Pclass': 'int64', 'Name': 'object', 'Sex': 'object', 'Age': 'float64', 'SibSp': 'int64', 'Parch': 'int64', 'Ticket': 'object', 'Fare': 'float64', 'Cabin': 'object', 'Embarked': 'object'}
        let dataframeColDict = ''
        let customReadCSVFunc = _customReadCSV ? _customReadCSV : 'read_csv(csv_data)'
        try {
            const code = `import pandas as pd
import base64
from io import StringIO
import json

base64_string = "${base64String}"

decoded_data = base64.b64decode(base64_string)

csv_data = StringIO(decoded_data.decode('utf-8'))

df = pd.${customReadCSVFunc}
my_dict = df.dtypes.astype(str).to_dict()
print(my_dict)
json.dumps(my_dict)`
            dataframeColDict = await pyodide.runPythonAsync(code)
        } catch (error) {
            throw new Error(error)
        }

        // Затем просим GPT сгенерировать ТОЛЬКО python код
        // Например: len(df), df[df['SibSp'] > 3]['PassengerId'].count()
        let pythonCode = ''
        if (dataframeColDict) {
            const chain = new LLMChain({
                llm: model,
                prompt: PromptTemplate.fromTemplate(systemPrompt),
                verbose: process.env.DEBUG === 'true'
            })
            const inputs = {
                dict: dataframeColDict,
                question: input
            }
            const res = await chain.call(inputs, [loggerHandler, ...callbacks])
            pythonCode = res?.text
            // Regex to get rid of markdown code blocks syntax
            pythonCode = pythonCode.replace(/^```[a-z]+\n|\n```$/gm, '')
        }

        // Затем запускаем код с помощью Pyodide
        let finalResult = ''
        if (pythonCode) {
            try {
                const code = `import pandas as pd\n${pythonCode}`
                // TODO: получить вывод консоли print
                finalResult = await pyodide.runPythonAsync(code)
            } catch (error) {
                throw new Error(`Извините, я не могу найти ответ на вопрос: "${input}" используя следующий код: "${pythonCode}"`)
            }
        }

        // В конце возвращаем полный ответ
        if (finalResult) {
            const chain = new LLMChain({
                llm: model,
                prompt: PromptTemplate.fromTemplate(
                    systemMessagePrompt ? `${systemMessagePrompt}\n${finalSystemPrompt}` : finalSystemPrompt
                ),
                verbose: process.env.DEBUG === 'true'
            })
            const inputs = {
                question: input,
                answer: finalResult
            }

            if (options.shouldStreamResponse) {
                const handler = new CustomChainHandler(shouldStreamResponse ? sseStreamer : undefined, chatId)
                const result = await chain.call(inputs, [loggerHandler, handler, ...callbacks])
                return result?.text
            } else {
                const result = await chain.call(inputs, [loggerHandler, ...callbacks])
                return result?.text
            }
        }

        return pythonCode
    }
}

module.exports = { nodeClass: CSV_Agents }
