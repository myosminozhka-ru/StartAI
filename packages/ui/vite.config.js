import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Плагин для разрешения osmi-ai-embed-react
const resolveOsmiEmbedPlugin = () => {
    return {
        name: 'resolve-osmi-embed-react',
        resolveId(id) {
            if (id === 'osmi-ai-embed-react') {
                // Пытаемся найти пакет в node_modules
                const packagePath = resolve(__dirname, '../../node_modules/osmi-ai-embed-react')
                try {
                    const fs = require('fs')
                    const packageJson = require(resolve(packagePath, 'package.json'))
                    // Используем exports из package.json
                    if (packageJson.exports && packageJson.exports['.'] && packageJson.exports['.'].import) {
                        return resolve(packagePath, packageJson.exports['.'].import)
                    }
                    // Fallback на module или main
                    if (packageJson.module) {
                        return resolve(packagePath, packageJson.module)
                    }
                    if (packageJson.main) {
                        return resolve(packagePath, packageJson.main)
                    }
                } catch (e) {
                    // Если не нашли, возвращаем null - Vite попробует сам
                    return null
                }
            }
            return null
        }
    }
}

export default defineConfig(async ({ mode }) => {
    let proxy = undefined
    if (mode === 'development') {
        const serverEnv = dotenv.config({ processEnv: {}, path: '../server/.env' }).parsed
        const serverHost = serverEnv?.['HOST'] ?? 'localhost'
        const serverPort = parseInt(serverEnv?.['PORT'] ?? 3000)
        if (!Number.isNaN(serverPort) && serverPort > 0 && serverPort < 65535) {
            proxy = {
                '^/api(/|$).*': {
                    target: `http://${serverHost}:${serverPort}`,
                    changeOrigin: true
                }
            }
        }
    }

    dotenv.config()
    return {
        plugins: [react(), resolveOsmiEmbedPlugin()],
        root: resolve(__dirname),
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@codemirror/state': resolve(__dirname, '../../node_modules/@codemirror/state'),
                '@codemirror/view': resolve(__dirname, '../../node_modules/@codemirror/view'),
                '@codemirror/language': resolve(__dirname, '../../node_modules/@codemirror/language'),
                '@codemirror/lang-javascript': resolve(__dirname, '../../node_modules/@codemirror/lang-javascript'),
                '@codemirror/lang-json': resolve(__dirname, '../../node_modules/@codemirror/lang-json'),
                '@uiw/react-codemirror': resolve(__dirname, '../../node_modules/@uiw/react-codemirror'),
                '@uiw/codemirror-theme-vscode': resolve(__dirname, '../../node_modules/@uiw/codemirror-theme-vscode'),
                '@uiw/codemirror-theme-sublime': resolve(__dirname, '../../node_modules/@uiw/codemirror-theme-sublime'),
                '@lezer/common': resolve(__dirname, '../../node_modules/@lezer/common'),
                '@lezer/highlight': resolve(__dirname, '../../node_modules/@lezer/highlight')
            }
        },
        build: {
            outDir: './build',
            rollupOptions: {
                external: ['osmi-ai-embed-react']
            }
        },
        server: {
            open: true,
            proxy,
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST
        }
    }
})
