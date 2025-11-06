import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        videosFolder: 'cypress/videos',
        screenshotsFolder: 'cypress/screenshots',
        video: true,
        screenshot: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
        setupNodeEvents(on, config) {
            // implement node event listeners here
            on('task', {
                log(message) {
                    console.log(message)
                    return null
                }
            })
        },
        env: {
            // Переменные окружения для тестов
            OSMI_AI_USERNAME: 'test',
            OSMI_AI_PASSWORD: 'test123'
        }
    },
    component: {
        devServer: {
            framework: 'react',
            bundler: 'webpack'
        }
    }
})
