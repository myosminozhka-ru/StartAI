// Глобальный setup для Jest в Node.js 22

// Настройка для совместимости с динамическими импортами
if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = require('node-fetch')
}

// Подавление предупреждений Node.js 22
process.removeAllListeners('warning')

// Настройка таймаутов
jest.setTimeout(30000)

// Настройка переменных окружения для тестов
process.env.NODE_ENV = 'test'
process.env.CI = 'true'

console.log('🧪 Jest setup completed for Node.js', process.version)
