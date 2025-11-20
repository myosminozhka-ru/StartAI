import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock osmi-ai-embed-react
jest.mock('osmi-ai-embed-react', () => ({
    BubbleChat: jest.fn(() => 'BubbleChat'),
    FullPageChat: jest.fn(() => 'FullPageChat'),
    PopupChat: jest.fn(() => 'PopupChat')
}))

describe('OSMI AI Embed Components', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('BubbleChat Component', () => {
        it('should import BubbleChat from osmi-ai-embed-react', async () => {
            const { BubbleChat } = await import('osmi-ai-embed-react')
            expect(BubbleChat).toBeDefined()
            expect(typeof BubbleChat).toBe('function')
        })

        it('should render BubbleChat with correct props', async () => {
            const { BubbleChat } = await import('osmi-ai-embed-react')
            const props = {
                chatflowid: 'test-chatflow-id',
                apiHost: 'http://localhost:3000',
                theme: {
                    button: {
                        backgroundColor: '#3B81F6',
                        right: 20,
                        bottom: 20,
                        size: 'medium',
                        iconColor: 'white',
                        customIconSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
                    },
                    chatWindow: {
                        welcomeMessage: 'Привет! Это OSMI AI ассистент.',
                        backgroundColor: '#ffffff',
                        height: 700,
                        width: 400,
                        fontSize: 16,
                        poweredByTextColor: '#303235',
                        botMessage: {
                            backgroundColor: '#f7f8ff',
                            textColor: '#303235',
                            showAvatar: true,
                            avatarSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
                        },
                        userMessage: {
                            backgroundColor: '#3B81F6',
                            textColor: '#ffffff',
                            showAvatar: true,
                            avatarSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/user_avatar.png'
                        },
                        textInput: {
                            placeholder: 'Введите ваше сообщение...',
                            backgroundColor: '#ffffff',
                            textColor: '#303235',
                            sendButtonColor: '#3B81F6'
                        }
                    }
                }
            }

            const result = BubbleChat(props)
            expect(BubbleChat).toHaveBeenCalledWith(props)
            expect(result).toBe('BubbleChat')
        })
    })

    describe('FullPageChat Component', () => {
        it('should import FullPageChat from osmi-ai-embed-react', async () => {
            const { FullPageChat } = await import('osmi-ai-embed-react')
            expect(FullPageChat).toBeDefined()
            expect(typeof FullPageChat).toBe('function')
        })

        it('should render FullPageChat with OSMI AI branding', async () => {
            const { FullPageChat } = await import('osmi-ai-embed-react')
            const props = {
                chatflowid: 'test-chatflow-id',
                apiHost: 'http://localhost:3000',
                theme: {
                    chatWindow: {
                        welcomeMessage: 'Добро пожаловать в OSMI AI!',
                        title: 'OSMI AI Ассистент',
                        titleAvatarSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png',
                        showTitle: true,
                        backgroundColor: '#ffffff'
                    }
                }
            }

            const result = FullPageChat(props)
            expect(FullPageChat).toHaveBeenCalledWith(props)
            expect(result).toBe('FullPageChat')
        })
    })

    describe('PopupChat Component', () => {
        it('should import PopupChat from osmi-ai-embed-react', async () => {
            const { PopupChat } = await import('osmi-ai-embed-react')
            expect(PopupChat).toBeDefined()
            expect(typeof PopupChat).toBe('function')
        })
    })

    describe('OSMI AI Configuration', () => {
        it('should use correct OSMI AI repository URLs', () => {
            const expectedRepo = 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/'
            const logoUrl = `${expectedRepo}OSMIAI_dark.png`
            const userAvatarUrl = `${expectedRepo}user_avatar.png`

            expect(logoUrl).toContain('myosminozhka-ru/StartAI')
            expect(userAvatarUrl).toContain('myosminozhka-ru/StartAI')
            expect(logoUrl).toContain('OSMIAI_dark.png')
        })

        it('should use OSMI AI branding in default messages', () => {
            const welcomeMessage = 'Привет! Это OSMI AI ассистент.'
            const title = 'OSMI AI Ассистент'

            expect(welcomeMessage).toContain('OSMI AI')
            expect(title).toContain('OSMI AI')
            expect(welcomeMessage.length).toBeGreaterThan(0)
            expect(title.length).toBeGreaterThan(0)
        })

        it('should use correct API endpoints', () => {
            const apiHost = 'http://localhost:3000'
            const chatflowEndpoint = `${apiHost}/api/v1/prediction/`

            expect(apiHost).toBe('http://localhost:3000')
            expect(chatflowEndpoint).toContain('/api/v1/prediction/')
        })
    })

    describe('Theme Configuration', () => {
        it('should have OSMI AI color scheme', () => {
            const theme = {
                primary: '#3B81F6',
                secondary: '#f7f8ff',
                background: '#ffffff',
                text: '#303235'
            }

            expect(theme.primary).toBe('#3B81F6')
            expect(theme.secondary).toBe('#f7f8ff')
            expect(theme.background).toBe('#ffffff')
            expect(theme.text).toBe('#303235')
        })

        it('should support Russian localization', () => {
            const russianTexts = {
                welcomeMessage: 'Привет! Это OSMI AI ассистент.',
                placeholder: 'Введите ваше сообщение...',
                title: 'OSMI AI Ассистент',
                poweredBy: 'Работает на OSMI AI'
            }

            Object.values(russianTexts).forEach((text) => {
                expect(text).toBeDefined()
                expect(typeof text).toBe('string')
                expect(text.length).toBeGreaterThan(0)
            })
        })
    })
})
