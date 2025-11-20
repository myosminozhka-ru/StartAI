/**
 * Простой тест для проверки работоспособности Jest в osmi-ai-components
 */

describe('OSMI AI Components Simple Tests', () => {
    it('should pass basic test', () => {
        expect(true).toBe(true)
    })

    it('should handle basic math', () => {
        expect(2 + 2).toBe(4)
        expect(10 - 5).toBe(5)
    })

    it('should handle strings', () => {
        const testString = 'OSMI AI'
        expect(testString).toContain('OSMI')
        expect(testString).toContain('AI')
        expect(testString.length).toBe(7)
    })

    it('should handle arrays', () => {
        const testArray = ['osmi', 'ai', 'components']
        expect(testArray).toHaveLength(3)
        expect(testArray).toContain('osmi')
        expect(testArray[1]).toBe('ai')
    })

    it('should handle objects', () => {
        const testObj = {
            name: 'OSMI AI',
            version: '3.0.8',
            type: 'components'
        }
        expect(testObj).toHaveProperty('name')
        expect(testObj.name).toBe('OSMI AI')
        expect(testObj.version).toBe('3.0.8')
    })
})
