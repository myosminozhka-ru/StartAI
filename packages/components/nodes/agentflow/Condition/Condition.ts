import { CommonType, ICommonObject, ICondition, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'

class Condition_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    tags: string[]
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Условие'
        this.name = 'conditionAgentflow'
        this.version = 1.0
        this.type = 'Condition'
        this.category = 'Agent Flows'
        this.description = `Разделение потоков на основе условий If Else`
        this.baseClasses = [this.type]
        this.color = '#FFB938'
        this.inputs = [
            {
                label: 'Условия',
                name: 'conditions',
                type: 'array',
                description: 'Значения для сравнения',
                acceptVariable: true,
                default: [
                    {
                        type: 'string',
                        value1: '',
                        operation: 'equal',
                        value2: ''
                    }
                ],
                array: [
                    {
                        label: 'Тип',
                        name: 'type',
                        type: 'options',
                        options: [
                            {
                                label: 'Строка',
                                name: 'string'
                            },
                            {
                                label: 'Число',
                                name: 'number'
                            },
                            {
                                label: 'Логический',
                                name: 'boolean'
                            }
                        ],
                        default: 'string'
                    },
                    /////////////////////////////////////// STRING ////////////////////////////////////////
                    {
                        label: 'Значение 1',
                        name: 'value1',
                        type: 'string',
                        default: '',
                        description: 'Первое значение для сравнения',
                        acceptVariable: true,
                        show: {
                            'conditions[$index].type': 'string'
                        }
                    },
                    {
                        label: 'Операция',
                        name: 'operation',
                        type: 'options',
                        options: [
                            {
                                label: 'Содержит',
                                name: 'contains'
                            },
                            {
                                label: 'Заканчивается на',
                                name: 'endsWith'
                            },
                            {
                                label: 'Равно',
                                name: 'equal'
                            },
                            {
                                label: 'Не содержит',
                                name: 'notContains'
                            },
                            {
                                label: 'Не равно',
                                name: 'notEqual'
                            },
                            {
                                label: 'Регулярное выражение',
                                name: 'regex'
                            },
                            {
                                label: 'Начинается с',
                                name: 'startsWith'
                            },
                            {
                                label: 'Пустое',
                                name: 'isEmpty'
                            },
                            {
                                label: 'Не пустое',
                                name: 'notEmpty'
                            }
                        ],
                        default: 'equal',
                        description: 'Тип операции',
                        show: {
                            'conditions[$index].type': 'string'
                        }
                    },
                    {
                        label: 'Значение 2',
                        name: 'value2',
                        type: 'string',
                        default: '',
                        description: 'Второе значение для сравнения',
                        acceptVariable: true,
                        show: {
                            'conditions[$index].type': 'string'
                        },
                        hide: {
                            'conditions[$index].operation': ['isEmpty', 'notEmpty']
                        }
                    },
                    /////////////////////////////////////// NUMBER ////////////////////////////////////////
                    {
                        label: 'Значение 1',
                        name: 'value1',
                        type: 'number',
                        default: '',
                        description: 'Первое значение для сравнения',
                        acceptVariable: true,
                        show: {
                            'conditions[$index].type': 'number'
                        }
                    },
                    {
                        label: 'Операция',
                        name: 'operation',
                        type: 'options',
                        options: [
                            {
                                label: 'Меньше',
                                name: 'smaller'
                            },
                            {
                                label: 'Меньше или равно',
                                name: 'smallerEqual'
                            },
                            {
                                label: 'Равно',
                                name: 'equal'
                            },
                            {
                                label: 'Не равно',
                                name: 'notEqual'
                            },
                            {
                                label: 'Больше',
                                name: 'larger'
                            },
                            {
                                label: 'Больше или равно',
                                name: 'largerEqual'
                            },
                            {
                                label: 'Пустое',
                                name: 'isEmpty'
                            },
                            {
                                label: 'Не пустое',
                                name: 'notEmpty'
                            }
                        ],
                        default: 'equal',
                        description: 'Тип операции',
                        show: {
                            'conditions[$index].type': 'number'
                        }
                    },
                    {
                        label: 'Значение 2',
                        name: 'value2',
                        type: 'number',
                        default: 0,
                        description: 'Второе значение для сравнения',
                        acceptVariable: true,
                        show: {
                            'conditions[$index].type': 'number'
                        }
                    },
                    /////////////////////////////////////// BOOLEAN ////////////////////////////////////////
                    {
                        label: 'Значение 1',
                        name: 'value1',
                        type: 'boolean',
                        default: false,
                        description: 'Первое значение для сравнения',
                        show: {
                            'conditions[$index].type': 'boolean'
                        }
                    },
                    {
                        label: 'Операция',
                        name: 'operation',
                        type: 'options',
                        options: [
                            {
                                label: 'Равно',
                                name: 'equal'
                            },
                            {
                                label: 'Не равно',
                                name: 'notEqual'
                            }
                        ],
                        default: 'equal',
                        description: 'Тип операции',
                        show: {
                            'conditions[$index].type': 'boolean'
                        }
                    },
                    {
                        label: 'Значение 2',
                        name: 'value2',
                        type: 'boolean',
                        default: false,
                        description: 'Второе значение для сравнения',
                        show: {
                            'conditions[$index].type': 'boolean'
                        }
                    }
                ]
            }
        ]
        this.outputs = [
            {
                label: '0',
                name: '0',
                description: 'Условие 0'
            },
            {
                label: '1',
                name: '1',
                description: 'Иначе'
            }
        ]
    }

    async run(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const state = options.agentflowRuntime?.state as ICommonObject

        const compareOperationFunctions: {
            [key: string]: (value1: CommonType, value2: CommonType) => boolean
        } = {
            contains: (value1: CommonType, value2: CommonType) => (value1 || '').toString().includes((value2 || '').toString()),
            notContains: (value1: CommonType, value2: CommonType) => !(value1 || '').toString().includes((value2 || '').toString()),
            endsWith: (value1: CommonType, value2: CommonType) => (value1 as string).endsWith(value2 as string),
            equal: (value1: CommonType, value2: CommonType) => value1 === value2,
            notEqual: (value1: CommonType, value2: CommonType) => value1 !== value2,
            larger: (value1: CommonType, value2: CommonType) => (Number(value1) || 0) > (Number(value2) || 0),
            largerEqual: (value1: CommonType, value2: CommonType) => (Number(value1) || 0) >= (Number(value2) || 0),
            smaller: (value1: CommonType, value2: CommonType) => (Number(value1) || 0) < (Number(value2) || 0),
            smallerEqual: (value1: CommonType, value2: CommonType) => (Number(value1) || 0) <= (Number(value2) || 0),
            startsWith: (value1: CommonType, value2: CommonType) => (value1 as string).startsWith(value2 as string),
            isEmpty: (value1: CommonType) => [undefined, null, ''].includes(value1 as string),
            notEmpty: (value1: CommonType) => ![undefined, null, ''].includes(value1 as string)
        }

        const _conditions = nodeData.inputs?.conditions
        const conditions: ICondition[] = typeof _conditions === 'string' ? JSON.parse(_conditions) : _conditions
        const initialConditions = { ...conditions }

        for (const condition of conditions) {
            const _value1 = condition.value1
            const _value2 = condition.value2
            const operation = condition.operation

            let value1: CommonType
            let value2: CommonType

            switch (condition.type) {
                case 'boolean':
                    value1 = _value1
                    value2 = _value2
                    break
                case 'number':
                    value1 = parseFloat(_value1 as string) || 0
                    value2 = parseFloat(_value2 as string) || 0
                    break
                default: // string
                    value1 = _value1 as string
                    value2 = _value2 as string
            }

            const compareOperationResult = compareOperationFunctions[operation](value1, value2)
            if (compareOperationResult) {
                // find the matching condition
                const conditionIndex = conditions.findIndex((c) => JSON.stringify(c) === JSON.stringify(condition))
                // add isFulfilled to the condition
                if (conditionIndex > -1) {
                    conditions[conditionIndex] = { ...condition, isFulfilled: true }
                }
                break
            }
        }

        // If no condition is fullfilled, add isFulfilled to the ELSE condition
        const dummyElseConditionData = {
            type: 'string',
            value1: '',
            operation: 'equal',
            value2: ''
        }
        if (!conditions.some((c) => c.isFulfilled)) {
            conditions.push({
                ...dummyElseConditionData,
                isFulfilled: true
            })
        } else {
            conditions.push({
                ...dummyElseConditionData,
                isFulfilled: false
            })
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: { conditions: initialConditions },
            output: { conditions },
            state
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Condition_Agentflow }
