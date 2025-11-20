// Простой тест для проверки работы Jest
describe('Simple Test Suite', () => {
    it('should pass basic test', () => {
        expect(1 + 1).toBe(2)
    })

    it('should handle strings correctly', () => {
        const message = 'OSMI AI is working!'
        expect(message).toContain('OSMI AI')
        expect(message.length).toBeGreaterThan(0)
    })

    it('should validate environment setup', () => {
        expect(process.env.NODE_ENV).toBe('test')
    })
})
