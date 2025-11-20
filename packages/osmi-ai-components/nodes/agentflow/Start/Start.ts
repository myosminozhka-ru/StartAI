import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class Start_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    hideInput: boolean
    baseClasses: string[]
    documentation?: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Старт'
        this.name = 'startAgentflow'
        this.version = 1.1
        this.type = 'Start'
        this.category = 'Agent Flows'
        this.description = 'Начальная точка агентского потока'
        this.baseClasses = [this.type]
        this.color = '#7EE787'
        this.hideInput = true
        this.inputs = [
            {
                label: 'Тип ввода',
                name: 'startInputType',
                type: 'options',
                options: [
                    {
                        label: 'Чат',
                        name: 'chatInput',
                        description: 'Начать разговор с ввода в чате'
                    },
                    {
                        label: 'Форма',
                        name: 'formInput',
                        description: 'Начать рабочий процесс с ввода формы'
                    }
                ],
                default: 'chatInput'
            },
            {
                label: 'Заголовок формы',
                name: 'formTitle',
                type: 'string',
                placeholder: 'Пожалуйста, заполните форму',
                show: {
                    startInputType: 'formInput'
                }
            },
            {
                label: 'Описание формы',
                name: 'formDescription',
                type: 'string',
                placeholder: 'Заполните все поля ниже для продолжения',
                show: {
                    startInputType: 'formInput'
                }
            },
            {
                label: 'Типы полей формы',
                name: 'formInputTypes',
                description: 'Укажите тип поля формы',
                type: 'array',
                show: {
                    startInputType: 'formInput'
                },
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
                            },
                            {
                                label: 'Варианты',
                                name: 'options'
                            }
                        ],
                        default: 'string'
                    },
                    {
                        label: 'Метка',
                        name: 'label',
                        type: 'string',
                        placeholder: 'Метка для поля ввода'
                    },
                    {
                        label: 'Имя переменной',
                        name: 'name',
                        type: 'string',
                        placeholder: 'Имя переменной для поля ввода (должно быть в camelCase)',
                        description: 'Имя переменной должно быть в camelCase. Например: firstName, lastName и т.д.'
                    },
                    {
                        label: 'Добавить варианты',
                        name: 'addOptions',
                        type: 'array',
                        show: {
                            'formInputTypes[$index].type': 'options'
                        },
                        array: [
                            {
                                label: 'Вариант',
                                name: 'option',
                                type: 'string'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Временная память',
                name: 'startEphemeralMemory',
                type: 'boolean',
                description: 'Начать заново для каждого выполнения без истории чата',
                optional: true
            },
            {
                label: 'Состояние потока',
                name: 'startState',
                description: 'Состояние выполнения во время работы потока',
                type: 'array',
                optional: true,
                array: [
                    {
                        label: 'Ключ',
                        name: 'key',
                        type: 'string',
                        placeholder: 'Foo'
                    },
                    {
                        label: 'Значение',
                        name: 'value',
                        type: 'string',
                        placeholder: 'Bar',
                        optional: true
                    }
                ]
            },
            {
                label: 'Сохранить состояние',
                name: 'startPersistState',
                type: 'boolean',
                description: 'Сохранить состояние в той же сессии',
                optional: true
            }
        ]
    }

    async run(nodeData: INodeData, input: string | Record<string, any>, options: ICommonObject): Promise<any> {
        const _flowState = nodeData.inputs?.startState as string
        const startInputType = nodeData.inputs?.startInputType as string
        const startEphemeralMemory = nodeData.inputs?.startEphemeralMemory as boolean
        const startPersistState = nodeData.inputs?.startPersistState as boolean

        let flowStateArray = []
        if (_flowState) {
            try {
                flowStateArray = typeof _flowState === 'string' ? JSON.parse(_flowState) : _flowState
            } catch (error) {
                throw new Error('Неверное состояние потока')
            }
        }

        let flowState: Record<string, any> = {}
        for (const state of flowStateArray) {
            flowState[state.key] = state.value
        }

        const runtimeState = options.agentflowRuntime?.state as ICommonObject
        if (startPersistState === true && runtimeState && Object.keys(runtimeState).length) {
            for (const state in runtimeState) {
                flowState[state] = runtimeState[state]
            }
        }

        const inputData: ICommonObject = {}
        const outputData: ICommonObject = {}

        if (startInputType === 'chatInput') {
            inputData.question = input
            outputData.question = input
        }

        if (startInputType === 'formInput') {
            inputData.form = {
                title: nodeData.inputs?.formTitle,
                description: nodeData.inputs?.formDescription,
                inputs: nodeData.inputs?.formInputTypes
            }

            let form = input
            if (options.agentflowRuntime?.form && Object.keys(options.agentflowRuntime.form).length) {
                form = options.agentflowRuntime.form
            }
            outputData.form = form
        }

        if (startEphemeralMemory) {
            outputData.ephemeralMemory = true
        }

        if (startPersistState) {
            outputData.persistState = true
        }

        const returnOutput = {
            id: nodeData.id,
            name: this.name,
            input: inputData,
            output: outputData,
            state: flowState
        }

        return returnOutput
    }
}

module.exports = { nodeClass: Start_Agentflow }
