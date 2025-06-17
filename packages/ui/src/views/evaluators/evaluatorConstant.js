// TODO: Move this to a config file
export const evaluators = [
    {
        type: 'text',
        name: 'ContainsAny',
        label: 'Содержит Любое',
        description: 'Возвращает true, если любое из указанных значений, разделенных запятыми, присутствует в ответе.'
    },
    {
        type: 'text',
        name: 'ContainsAll',
        label: 'Содержит Все',
        description: 'Возвращает true, если ВСЕ указанные значения, разделенные запятыми, присутствуют в ответе.'
    },
    {
        type: 'text',
        name: 'DoesNotContainAny',
        label: 'Не Содержит Любое',
        description: 'Возвращает true, если любое из указанных значений, разделенных запятыми, присутствует в ответе.'
    },
    {
        type: 'text',
        name: 'DoesNotContainAll',
        label: 'Не Содержит Все',
        description: 'Возвращает true, если ВСЕ указанные значения, разделенные запятыми, присутствуют в ответе.'
    },
    {
        type: 'text',
        name: 'StartsWith',
        label: 'Начинается С',
        description: 'Возвращает true, если ответ начинается с указанного значения.'
    },
    {
        type: 'text',
        name: 'NotStartsWith',
        label: 'Не Начинается С',
        description: 'Возвращает true, если ответ не начинается с указанного значения.'
    },
    {
        type: 'json',
        name: 'IsValidJSON',
        label: 'Является Валидным JSON',
        description: 'Возвращает true, если ответ является валидным JSON.'
    },
    {
        type: 'json',
        name: 'IsNotValidJSON',
        label: 'Не Является Валидным JSON',
        description: 'Возвращает true, если ответ не является валидным JSON.'
    },
    {
        type: 'numeric',
        name: 'totalTokens',
        label: 'Всего Токенов',
        description: 'Сумма токенов промпта и токенов завершения.'
    },
    {
        type: 'numeric',
        label: 'Токены Промпта',
        name: 'promptTokens',
        description: 'Это количество токенов в вашем промпте.'
    },
    {
        type: 'numeric',
        label: 'Токены Завершения',
        name: 'completionTokens',
        description: 'Токены завершения - это любые токены, которые модель генерирует в ответ на ваш ввод.'
    },
    {
        type: 'numeric',
        label: 'Общая Задержка API',
        name: 'apiLatency',
        description: 'Общее время, затраченное на вызов Flowise Prediction API (миллисекунды).'
    },
    {
        type: 'numeric',
        label: 'Задержка LLM',
        name: 'llm',
        description: 'Фактическое время вызова LLM (миллисекунды).'
    },
    {
        type: 'numeric',
        label: 'Задержка Чатфлоу',
        name: 'chain',
        description: 'Фактическое время, затраченное на выполнение чатфлоу (миллисекунды).'
    },
    {
        type: 'numeric',
        label: 'Длина Ответа в Символах',
        name: 'responseLength',
        description: 'Количество символов в ответе.'
    }
]

export const evaluatorTypes = [
    {
        label: 'Оценка Результата (На Основе Текста)',
        name: 'text',
        description: 'Набор оценщиков для оценки результата чатфлоу.'
    },
    {
        label: 'Оценка Результата (JSON)',
        name: 'json',
        description: 'Набор оценщиков для оценки JSON-ответа чатфлоу.'
    },
    {
        label: 'Оценка Метрик (Числовые)',
        name: 'numeric',
        description: 'Набор оценщиков, которые оценивают метрики (задержка, токены, стоимость, длина ответа) чатфлоу.'
    },
    {
        label: 'Оценка на Основе LLM (JSON)',
        name: 'llm',
        description: 'После выполнения оценивает ответы, используя LLM.'
    }
]

export const numericOperators = [
    {
        label: 'Равно',
        name: 'equals'
    },
    {
        label: 'Не Равно',
        name: 'notEquals'
    },
    {
        label: 'Больше Чем',
        name: 'greaterThan'
    },
    {
        label: 'Меньше Чем',
        name: 'lessThan'
    },
    {
        label: 'Больше Или Равно',
        name: 'greaterThanOrEquals'
    },
    {
        label: 'Меньше Или Равно',
        name: 'lessThanOrEquals'
    }
]
