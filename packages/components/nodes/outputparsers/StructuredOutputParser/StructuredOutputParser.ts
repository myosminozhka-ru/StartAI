import { z } from 'zod'
import { BaseOutputParser } from '@langchain/core/output_parsers'
import { StructuredOutputParser as LangchainStructuredOutputParser } from 'langchain/output_parsers'
import { CATEGORY } from '../OutputParserHelpers'
import { convertSchemaToZod, getBaseClasses, INode, INodeData, INodeParams } from '../../../src'
import { jsonrepair } from 'jsonrepair'

class StructuredOutputParser implements INode {
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
        this.label = 'Структурированный парсер вывода'
        this.name = 'structuredOutputParser'
        this.version = 1.0
        this.type = 'StructuredOutputParser'
        this.description = 'Парсить вывод вызова LLM в заданную (JSON) структуру.'
        this.icon = 'structure.svg'
        this.category = CATEGORY
        this.baseClasses = [this.type, ...getBaseClasses(BaseOutputParser)]
        this.inputs = [
            {
                label: 'Автоисправление',
                name: 'autofixParser',
                type: 'boolean',
                optional: true,
                description: 'В случае неудачи первого вызова, сделает еще один вызов к модели для исправления любых ошибок.'
            },
            {
                label: 'JSON структура',
                name: 'jsonStructure',
                type: 'datagrid',
                description: 'JSON структура для возврата LLM',
                datagrid: [
                    { field: 'property', headerName: 'Свойство', editable: true },
                    {
                        field: 'type',
                        headerName: 'Тип',
                        type: 'singleSelect',
                        valueOptions: ['string', 'number', 'boolean'],
                        editable: true
                    },
                    { field: 'description', headerName: 'Описание', editable: true, flex: 1 }
                ],
                default: [
                    {
                        property: 'answer',
                        type: 'string',
                        description: `ответ на вопрос пользователя`
                    },
                    {
                        property: 'source',
                        type: 'string',
                        description: `источники, использованные для ответа на вопрос, должны быть веб-сайтами`
                    }
                ],
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const jsonStructure = nodeData.inputs?.jsonStructure as string
        const autoFix = nodeData.inputs?.autofixParser as boolean

        try {
            const zodSchema = z.object(convertSchemaToZod(jsonStructure)) as any
            const structuredOutputParser = LangchainStructuredOutputParser.fromZodSchema(zodSchema)

            const baseParse = structuredOutputParser.parse

            // Fix broken JSON from LLM
            structuredOutputParser.parse = (text) => {
                const jsonString = text.includes('```') ? text.trim().split(/```(?:json)?/)[1] : text.trim()
                return baseParse.call(structuredOutputParser, jsonrepair(jsonString))
            }

            // NOTE: When we change Flowise to return a json response, the following has to be changed to: JsonStructuredOutputParser
            Object.defineProperty(structuredOutputParser, 'autoFix', {
                enumerable: true,
                configurable: true,
                writable: true,
                value: autoFix
            })
            return structuredOutputParser
        } catch (exception) {
            throw new Error('Invalid JSON in StructuredOutputParser: ' + exception)
        }
    }
}

module.exports = { nodeClass: StructuredOutputParser }
