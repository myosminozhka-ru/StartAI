// Mock для osmi-ai-embed-react в тестах
module.exports = {
    BubbleChat: jest.fn((props) => {
        return {
            type: 'BubbleChat',
            props: props,
            render: () => '<div data-testid="bubble-chat">OSMI AI Bubble Chat</div>'
        }
    }),

    FullPageChat: jest.fn((props) => {
        return {
            type: 'FullPageChat',
            props: props,
            render: () => '<div data-testid="fullpage-chat">OSMI AI Full Page Chat</div>'
        }
    }),

    PopupChat: jest.fn((props) => {
        return {
            type: 'PopupChat',
            props: props,
            render: () => '<div data-testid="popup-chat">OSMI AI Popup Chat</div>'
        }
    }),

    // Дополнительные утилиты для тестирования
    __esModule: true,

    // Мок конфигурации по умолчанию
    defaultConfig: {
        apiHost: 'http://localhost:3000',
        theme: {
            button: {
                backgroundColor: '#3B81F6',
                iconColor: 'white',
                customIconSrc: 'https://raw.githubusercontent.com/myosminozhka-ru/StartAI/main/assets/OSMIAI_dark.png'
            },
            chatWindow: {
                welcomeMessage: 'Привет! Это OSMI AI ассистент.',
                title: 'OSMI AI Ассистент',
                backgroundColor: '#ffffff'
            }
        }
    }
}
