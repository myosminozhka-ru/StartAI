import { useSelector } from 'react-redux'
import { useEffect } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)

    const useYandexMetrika = () => {
        let ymID
        switch (window.location.hostname) {
            case 'u1.start-ai.ru':
                ymID = 95948128
                break
            case 'u2.start-ai.ru':
                ymID = 95948132
                break
            case 'u3.start-ai.ru':
                ymID = 95948136
                break
            case 'u4.start-ai.ru':
                ymID = 95948139
                break
            case 'u5.start-ai.ru':
                ymID = 95948140
                break
            case 'u6.start-ai.ru':
                ymID = 96465123
                break
            case 'u7.start-ai.ru':
                ymID = 96465137
                break
            case 'u8.start-ai.ru':
                ymID = 96465147
                break
            case 'u9.start-ai.ru':
                ymID = 96465152
                break
            case 'u10.start-ai.ru':
                ymID = 96465160
                break
            case 'u11.start-ai.ru':
                ymID = 96465177
                break
            case 'u12.start-ai.ru':
                ymID = 96465190
                break
            default:
                // Действия по умолчанию, если NODE_ENV не соответствует ни одному из условий
                ymID = 0
                break
        }
        useEffect(() => {
            if (ymID > 0) {
                // Функция инициализации метрики
                ;(function (m, e, t, r, i, k, a) {
                    m[i] =
                        m[i] ||
                        function () {
                            ;(m[i].a = m[i].a || []).push(arguments)
                        }
                    m[i].l = 1 * new Date()
                    k = e.createElement(t)
                    a = e.getElementsByTagName(t)[0]
                    k.async = 1
                    k.src = r
                    a.parentNode.insertBefore(k, a)
                })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym')

                window.ym(ymID, 'init', {
                    clickmap: true,
                    trackLinks: true,
                    accurateTrackBounce: true,
                    webvisor: true
                })
            }
        }, [ymID])
    }

    useYandexMetrika()

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <NavigationScroll>
                    <Routes />
                </NavigationScroll>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
