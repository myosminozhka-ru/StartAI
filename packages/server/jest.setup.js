// Jest setup для OSMI AI Server

// Настройка переменных окружения для тестов
process.env.NODE_ENV = 'test'
process.env.DATABASE_TYPE = 'sqlite'
process.env.DATABASE_PATH = ':memory:'
process.env.OSMI_AI_USERNAME = 'test'
process.env.OSMI_AI_PASSWORD = 'test123'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-osmi-ai'
process.env.OVERRIDE_DATABASE = 'true'

// Увеличиваем таймаут для API тестов
jest.setTimeout(30000)

// Глобальная настройка для всех тестов
beforeAll(async () => {
    // Инициализация тестовой базы данных
    // eslint-disable-next-line no-console
    console.log('🔧 Setting up test environment for OSMI AI...')
})

afterAll(async () => {
    // Очистка после всех тестов
    // eslint-disable-next-line no-console
    console.log('🧹 Cleaning up test environment...')
})

beforeEach(() => {
    // Очистка моков перед каждым тестом
    jest.clearAllMocks()
})

// Мок для внешних сервисов
jest.mock('node-fetch', () => jest.fn())

// Подавляем логи в тестах (кроме ошибок)
// eslint-disable-next-line no-console
const originalConsoleLog = console.log
// const originalConsoleInfo = console.info
// const originalConsoleWarn = console.warn

// eslint-disable-next-line no-console
console.log = jest.fn()
console.info = jest.fn()
console.warn = jest.fn()

// Оставляем только ошибки для отладки
console.error = (...args) => {
    if (process.env.DEBUG_TESTS) {
        originalConsoleLog('[TEST ERROR]', ...args)
    }
}

// Утилиты для тестов
global.testUtils = {
    // Создание тестового пользователя
    createTestUser: () => ({
        id: 'test-user-id',
        username: 'test-user',
        password: 'test123',
        role: 'user'
    }),

    // Создание тестового chatflow
    createTestChatflow: () => ({
        id: 'test-chatflow-id',
        name: 'OSMI AI Test Chatflow',
        description: 'Тестовый чат-поток для OSMI AI',
        flowData: JSON.stringify({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
        }),
        deployed: true,
        isPublic: true,
        chatbotConfig: JSON.stringify({
            welcomeMessage: 'Привет! Это OSMI AI ассистент.',
            backgroundColor: '#ffffff',
            botMessage: {
                backgroundColor: '#f7f8ff',
                textColor: '#303235',
                showAvatar: true,
                avatarSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
            }
        })
    }),

    // Ожидание с таймаутом
    waitFor: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    // Проверка на OSMI AI брендинг
    checkOSMIBranding: (text) => {
        expect(text).not.toContain('flowise')
        expect(text).not.toContain('Flowise')
        // Можно добавить проверку на наличие OSMI AI
        // expect(text.toLowerCase()).toContain('osmi')
    }
}
