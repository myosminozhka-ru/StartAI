// Jest setup для OSMI AI Components
const { TextEncoder, TextDecoder } = require('util')

// Полифиллы для Node.js окружения
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Мок для fetch API
global.fetch = jest.fn()

// Мок для console методов в тестах
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
    // Очистка моков перед каждым тестом
    jest.clearAllMocks()

    // Сброс fetch мока
    fetch.mockClear()
})

afterEach(() => {
    // Восстановление console методов
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
})

// Глобальные моки для OSMI AI
jest.mock('osmi-ai-embed-react', () => require('../../__mocks__/osmi-ai-embed-react'))

// Мок для процесса окружения
process.env.NODE_ENV = 'test'
process.env.OSMI_AI_TEST = 'true'

// Увеличиваем таймаут для медленных тестов
jest.setTimeout(10000)

// Подавляем предупреждения в тестах
console.warn = jest.fn()

// Настройки для тестирования React компонентов (если нужно)
if (typeof window !== 'undefined') {
    // Мок для localStorage
    const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    }
    global.localStorage = localStorageMock

    // Мок для sessionStorage
    global.sessionStorage = localStorageMock
}
