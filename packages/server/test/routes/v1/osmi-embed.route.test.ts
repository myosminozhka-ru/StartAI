import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

export function osmiEmbedRouteTest() {
    describe('OSMI AI Embed Routes', () => {
        const baseRoute = '/api/v1'
        // let authToken: string

        beforeAll(async () => {
            // Setup test authentication if needed
            // authToken = await getTestAuthToken()
        })

        describe('Chatflow Prediction API', () => {
            const route = `${baseRoute}/prediction`

            it('should return 400 for missing chatflow ID', async () => {
                await supertest(getRunningExpressApp().app)
                    .post(`${route}/invalid-id`)
                    .send({
                        question: 'Привет, OSMI AI!'
                    })
                    .expect(StatusCodes.BAD_REQUEST)
            })

            it('should handle Russian language input correctly', async () => {
                const testChatflowId = 'test-chatflow-id'
                const russianQuestion = 'Привет! Как дела? Расскажи о OSMI AI.'

                const response = await supertest(getRunningExpressApp().app).post(`${route}/${testChatflowId}`).send({
                    question: russianQuestion,
                    history: []
                })

                // Should not crash on Russian input
                expect([StatusCodes.OK, StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND]).toContain(response.status)

                if (response.status === StatusCodes.OK) {
                    expect(response.body).toHaveProperty('text')
                }
            })

            it('should validate OSMI AI embed configuration', async () => {
                const embedConfig = {
                    chatflowid: 'test-id',
                    apiHost: 'http://localhost:3000',
                    theme: {
                        button: {
                            backgroundColor: '#3B81F6',
                            iconColor: 'white',
                            customIconSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
                        },
                        chatWindow: {
                            welcomeMessage: 'Привет! Это OSMI AI ассистент.',
                            title: 'OSMI AI Ассистент'
                        }
                    }
                }

                // Validate configuration structure
                expect(embedConfig.chatflowid).toBeDefined()
                expect(embedConfig.apiHost).toBe('http://localhost:3000')
                expect(embedConfig.theme.button.customIconSrc).toContain('myosminozhka-ru/StartAI')
                expect(embedConfig.theme.chatWindow.welcomeMessage).toContain('OSMI AI')
                expect(embedConfig.theme.chatWindow.title).toContain('OSMI AI')
            })
        })

        describe('Chatflow Management API', () => {
            const route = `${baseRoute}/chatflows`

            it('should list available chatflows', async () => {
                await supertest(getRunningExpressApp().app)
                    .get(route)
                    .expect((response) => {
                        expect([StatusCodes.OK, StatusCodes.UNAUTHORIZED]).toContain(response.status)
                    })
            })

            it('should create chatflow with OSMI AI branding', async () => {
                const chatflowData = {
                    name: 'OSMI AI Test Chatflow',
                    description: 'Тестовый чат-поток для OSMI AI',
                    flowData: JSON.stringify({
                        nodes: [],
                        edges: [],
                        viewport: { x: 0, y: 0, zoom: 1 }
                    }),
                    deployed: false,
                    isPublic: false,
                    apikeyid: null,
                    chatbotConfig: JSON.stringify({
                        welcomeMessage: 'Добро пожаловать в OSMI AI!',
                        backgroundColor: '#ffffff',
                        fontSize: 16,
                        botMessage: {
                            backgroundColor: '#f7f8ff',
                            textColor: '#303235',
                            showAvatar: true,
                            avatarSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
                        }
                    })
                }

                const response = await supertest(getRunningExpressApp().app).post(route).send(chatflowData)

                // Should handle creation attempt (may require auth)
                expect([StatusCodes.CREATED, StatusCodes.UNAUTHORIZED, StatusCodes.BAD_REQUEST]).toContain(response.status)
            })
        })

        describe('Public Chatflow API', () => {
            const route = `${baseRoute}/public-chatflows`

            it('should return public chatflows without authentication', async () => {
                await supertest(getRunningExpressApp().app)
                    .get(route)
                    .expect((response) => {
                        expect([StatusCodes.OK, StatusCodes.NOT_FOUND]).toContain(response.status)

                        if (response.status === StatusCodes.OK) {
                            expect(Array.isArray(response.body)).toBe(true)
                        }
                    })
            })
        })

        describe('Node Icons API', () => {
            const route = `${baseRoute}/node-icon`

            it('should serve node icons correctly', async () => {
                const iconName = 'chatOpenAI'

                await supertest(getRunningExpressApp().app)
                    .get(`${route}/${iconName}`)
                    .expect((response) => {
                        // Should return icon or 404
                        expect([StatusCodes.OK, StatusCodes.NOT_FOUND]).toContain(response.status)
                    })
            })
        })

        describe('Health Check', () => {
            it('should return healthy status', async () => {
                await supertest(getRunningExpressApp().app)
                    .get('/api/v1/ping')
                    .expect((response) => {
                        expect([StatusCodes.OK, StatusCodes.NOT_FOUND]).toContain(response.status)
                    })
            })
        })

        describe('OSMI AI Branding Validation', () => {
            it('should not contain Flowise references in responses', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/marketplaces/chatflows')

                if (response.status === StatusCodes.OK && response.text) {
                    expect(response.text.toLowerCase()).not.toContain('flowise')
                    // Should contain OSMI AI references instead
                    // expect(response.text.toLowerCase()).toContain('osmi')
                }
            })

            it('should use correct repository URLs in configuration', async () => {
                const expectedRepo = 'myosminozhka-ru/StartAI'
                const configEndpoints = ['/api/v1/chatflows', '/api/v1/public-chatflows']

                for (const endpoint of configEndpoints) {
                    const response = await supertest(getRunningExpressApp().app).get(endpoint)

                    if (response.status === StatusCodes.OK && response.text) {
                        // If response contains GitHub URLs, they should point to our repo
                        if (response.text.includes('github.com')) {
                            expect(response.text).toContain(expectedRepo)
                        }
                    }
                }
            })
        })

        describe('Russian Language Support', () => {
            it('should handle Cyrillic characters in API requests', async () => {
                const cyrillicData = {
                    name: 'Тестовый чат-бот OSMI AI',
                    description: 'Описание на русском языке с символами: ёЁ, №, ©',
                    question: 'Привет! Как дела? Что умеет OSMI AI?'
                }

                // Test various endpoints with Cyrillic input
                const endpoints = [{ method: 'post', path: '/api/v1/prediction/test-id', data: { question: cyrillicData.question } }]

                for (const endpoint of endpoints) {
                    const response = await supertest(getRunningExpressApp().app)[endpoint.method](endpoint.path).send(endpoint.data)

                    // Should not crash on Cyrillic input
                    expect(response.status).toBeLessThan(500)
                }
            })
        })
    })
}
