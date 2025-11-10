import { generateAPIKey } from '../../src/utils/apiKey'

describe('Api Key', () => {
    it('should be able to generate a new api key', () => {
        const apiKey = generateAPIKey()
        expect(typeof apiKey === 'string').toEqual(true)
        expect(apiKey.length).toBeGreaterThan(0)
    })

    it('should generate unique api keys', () => {
        const apiKey1 = generateAPIKey()
        const apiKey2 = generateAPIKey()
        expect(apiKey1).not.toEqual(apiKey2)
    })
})

export function apiKeyTest() {
    // Экспортируем для совместимости с index.test.ts
}
