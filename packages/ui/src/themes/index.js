import { createTheme } from '@mui/material/styles'

// assets
import colors from '@/assets/scss/_themes-vars.module.scss'
import colorsOSMI_AI from '@/assets/scss/_themes-osmi-ai.module.scss'

// project imports
import componentStyleOverrides from './compStyleOverride'
import themePalette from './palette'
import themeTypography from './typography'

/**
 * Represent theme style and structure as per Material-UI
 * @param {JsonObject} customization customization parameter object
 */

export const theme = (customization) => {
    let color = colors

    switch (window.location.hostname) {
        case 'app.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u1.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u2.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u3.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u4.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u5.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u6.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u7.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u8.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u9.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u10.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u11.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'u12.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'test.osmi-ai.ru':
            color = colorsOSMI_AI
            break
        case 'localhost':
            color = colorsOSMI_AI
            break
        default:
            // Действия по умолчанию, если NODE_ENV не соответствует ни одному из условий
            color = colors
            break
    }
    const themeOption = customization.isDarkMode
        ? {
              colors: color,
              heading: color.paper,
              paper: color.darkPrimaryLight,
              backgroundDefault: color.darkPaper,
              background: color.darkPrimaryLight,
              darkTextPrimary: color.paper,
              darkTextSecondary: color.paper,
              textDark: color.paper,
              menuSelected: color.darkSecondaryDark,
              menuSelectedBack: color.darkSecondaryLight,
              divider: color.darkPaper,
              customization
          }
        : {
              colors: color,
              heading: color.grey900,
              paper: color.paper,
              backgroundDefault: color.paper,
              background: color.primaryLight,
              darkTextPrimary: color.grey700,
              darkTextSecondary: color.grey500,
              textDark: color.grey900,
              menuSelected: color.secondaryDark,
              menuSelectedBack: color.secondaryLight,
              divider: color.grey200,
              customization
          }

    const themeOptions = {
        direction: 'ltr',
        palette: themePalette(themeOption),
        mixins: {
            toolbar: {
                minHeight: '48px',
                padding: '16px',
                '@media (min-width: 600px)': {
                    minHeight: '48px'
                }
            }
        },
        typography: themeTypography(themeOption)
    }

    const themes = createTheme(themeOptions)
    themes.components = componentStyleOverrides(themeOption)

    return themes
}

export default theme
