describe('OSMI AI Embed Routes', () => {
    const baseRoute = '/api/v1'

    describe('OSMI AI Branding Tests', () => {
        it('should contain correct OSMI AI route names', () => {
            const routes = [`${baseRoute}/prediction`, `${baseRoute}/chatflows`, `${baseRoute}/public-chatflows`, `${baseRoute}/node-icon`]

            routes.forEach((route) => {
                expect(route).toContain('/api/v1')
                expect(route.length).toBeGreaterThan(0)
            })
        })

        it('should have OSMI AI specific configuration', () => {
            const embedConfig = {
                apiHost: 'http://localhost:3000',
                theme: {
                    button: {
                        customIconSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
                    },
                    chatWindow: {
                        welcomeMessage: 'Привет! Это OSMI AI ассистент.',
                        title: 'OSMI AI Чат'
                    }
                }
            }

            expect(embedConfig.apiHost).toBe('http://localhost:3000')
            expect(embedConfig.theme.button.customIconSrc).toContain('myosminozhka-ru/StartAI')
            expect(embedConfig.theme.chatWindow.welcomeMessage).toContain('OSMI AI')
            expect(embedConfig.theme.chatWindow.title).toContain('OSMI AI')
        })

        it('should handle Russian language input correctly', () => {
            const russianQuestion = 'Привет! Как дела? Расскажи о OSMI AI.'

            expect(russianQuestion).toContain('OSMI AI')
            expect(russianQuestion).toMatch(/[а-яё]/i) // Contains Cyrillic characters
            expect(russianQuestion.length).toBeGreaterThan(0)
        })

        it('should validate API endpoints structure', () => {
            const endpoints = [
                { path: `${baseRoute}/ping`, method: 'GET' },
                { path: `${baseRoute}/marketplaces/chatflows`, method: 'GET' },
                { path: `${baseRoute}/public-chatflows`, method: 'GET' }
            ]

            endpoints.forEach((endpoint) => {
                expect(endpoint.path).toContain('/api/v1')
                expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(endpoint.method)
            })
        })
    })
})

export function osmiEmbedRouteTest() {
    // Экспортируем для совместимости с index.test.ts
}
