// assets
import {
    IconTrash,
    IconFileUpload,
    IconFileExport,
    IconCopy,
    IconMessage,
    IconDatabaseExport,
    IconAdjustmentsHorizontal,
    IconUsers,
    IconTemplate
} from '@tabler/icons-react'

// constant
const icons = {
    IconTrash,
    IconFileUpload,
    IconFileExport,
    IconCopy,
    IconMessage,
    IconDatabaseExport,
    IconAdjustmentsHorizontal,
    IconUsers,
    IconTemplate
}

// ==============================|| SETTINGS MENU ITEMS ||============================== //

const agent_settings = {
    id: 'settings',
    title: '',
    type: 'group',
    children: [
        {
            id: 'viewMessages',
            title: 'Просмотр сообщений',
            type: 'item',
            url: '',
            icon: icons.IconMessage
        },
        {
            id: 'viewLeads',
            title: 'Просмотр лидов',
            type: 'item',
            url: '',
            icon: icons.IconUsers
        },
        {
            id: 'chatflowConfiguration',
            title: 'Конфигурация',
            type: 'item',
            url: '',
            icon: icons.IconAdjustmentsHorizontal,
            permission: 'agentflows:config'
        },
        {
            id: 'saveAsTemplate',
            title: 'Сохранить как шаблон',
            type: 'item',
            url: '',
            icon: icons.IconTemplate,
            permission: 'templates:flowexport'
        },
        {
            id: 'saveAsTemplate',
            title: 'Сохранить как шаблон',
            type: 'item',
            url: '',
            icon: icons.IconTemplate
        },
        {
            id: 'duplicateChatflow',
            title: 'Дублировать агентов',
            type: 'item',
            url: '',
            icon: icons.IconCopy,
            permission: 'agentflows:duplicate'
        },
        {
            id: 'loadChatflow',
            title: 'Загрузить агентов',
            type: 'item',
            url: '',
            icon: icons.IconFileUpload,
            permission: 'agentflows:import'
        },
        {
            id: 'exportChatflow',
            title: 'Экспорт агентов',
            type: 'item',
            url: '',
            icon: icons.IconFileExport,
            permission: 'agentflows:export'
        },
        {
            id: 'deleteChatflow',
            title: 'Удалить агентов',
            type: 'item',
            url: '',
            icon: icons.IconTrash,
            permission: 'agentflows:delete'
        }
    ]
}

export default agent_settings
