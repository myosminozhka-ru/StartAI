// assets
import {
    IconList,
    IconUsersGroup,
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconChartHistogram,
    IconUserEdit,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock,
    IconListCheck
} from '@tabler/icons-react'

// constant
const icons = {
    IconHierarchy,
    IconUsersGroup,
    IconBuildingStore,
    IconList,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconUserEdit,
    IconChartHistogram,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock,
    IconListCheck
}

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'primary',
            title: '',
            type: 'group',
            children: [
                {
                    id: 'chatflows',
                    title: 'Агенты',
                    type: 'item',
                    url: '/chatflows',
                    icon: icons.IconHierarchy,
                    breadcrumbs: true,
                    permission: 'chatflows:view'
                },
                {
                    id: 'agentflows',
                    title: 'Мульти агенты',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconUsersGroup,
                    breadcrumbs: true,
                    permission: 'agentflows:view'
                },
                {
                    id: 'executions',
                    title: 'Аналитика',
                    type: 'item',
                    url: '/executions',
                    icon: icons.IconListCheck,
                    breadcrumbs: true,
                    permission: 'executions:view'
                },
                {
                    id: 'assistants',
                    title: 'Ассистенты',
                    type: 'item',
                    url: '/assistants',
                    icon: icons.IconRobot,
                    breadcrumbs: true,
                    permission: 'assistants:view'
                },
                {
                    id: 'marketplaces',
                    title: 'Шаблоны',
                    type: 'item',
                    url: '/marketplaces',
                    icon: icons.IconBuildingStore,
                    breadcrumbs: true,
                    permission: 'templates:marketplace,templates:custom'
                },
                {
                    id: 'tools',
                    title: 'Интеграции',
                    type: 'item',
                    url: '/tools',
                    icon: icons.IconTool,
                    breadcrumbs: true,
                    permission: 'tools:view'
                },
                {
                    id: 'credentials',
                    title: 'API сервисов',
                    type: 'item',
                    url: '/credentials',
                    icon: icons.IconLock,
                    breadcrumbs: true,
                    permission: 'credentials:view'
                },
                {
                    id: 'variables',
                    title: 'Параметры',
                    type: 'item',
                    url: '/variables',
                    icon: icons.IconVariable,
                    breadcrumbs: true,
                    permission: 'variables:view'
                },
                {
                    id: 'apikey',
                    title: 'API агентов',
                    type: 'item',
                    url: '/apikey',
                    icon: icons.IconKey,
                    breadcrumbs: true,
                    permission: 'apikeys:view'
                },
                {
                    id: 'document-stores',
                    title: 'База документов',
                    type: 'item',
                    url: '/document-stores',
                    icon: icons.IconFiles,
                    breadcrumbs: true,
                    permission: 'documentStores:view'
                }
            ]
        },
        {
            id: 'evaluations',
            title: 'Тестирование',
            type: 'group',
            children: [
                {
                    id: 'datasets',
                    title: 'Тест кейсы',
                    type: 'item',
                    url: '/datasets',
                    icon: icons.IconDatabase,
                    breadcrumbs: true,
                    display: 'feat:datasets',
                    permission: 'datasets:view'
                },
                {
                    id: 'evaluators',
                    title: 'AI тестировщики',
                    type: 'item',
                    url: '/evaluators',
                    icon: icons.IconTestPipe,
                    breadcrumbs: true,
                    display: 'feat:evaluators',
                    permission: 'evaluators:view'
                },
                {
                    id: 'evaluations',
                    title: 'Результаты',
                    type: 'item',
                    url: '/evaluations',
                    icon: icons.IconChartHistogram,
                    breadcrumbs: true,
                    display: 'feat:evaluations',
                    permission: 'evaluations:view'
                }
            ]
        },
        {
            id: 'management',
            title: 'Управление пользователями и рабочими пространствами',
            type: 'group',
            children: [
                {
                    id: 'sso',
                    title: 'Настройка SSO',
                    type: 'item',
                    url: '/sso-config',
                    icon: icons.IconShieldLock,
                    breadcrumbs: true,
                    display: 'feat:sso-config',
                    permission: 'sso:manage'
                },
                {
                    id: 'roles',
                    title: 'Роли',
                    type: 'item',
                    url: '/roles',
                    icon: icons.IconLockCheck,
                    breadcrumbs: true,
                    display: 'feat:roles',
                    permission: 'roles:manage'
                },
                {
                    id: 'users',
                    title: 'Пользователи',
                    type: 'item',
                    url: '/users',
                    icon: icons.IconUsers,
                    breadcrumbs: true,
                    display: 'feat:users',
                    permission: 'users:manage'
                },
                {
                    id: 'workspaces',
                    title: 'Рабочие пространства',
                    type: 'item',
                    url: '/workspaces',
                    icon: icons.IconStack2,
                    breadcrumbs: true,
                    display: 'feat:workspaces',
                    permission: 'workspace:view'
                },
                {
                    id: 'login-activity',
                    title: 'Активность входа',
                    type: 'item',
                    url: '/login-activity',
                    icon: icons.IconClipboardList,
                    breadcrumbs: true,
                    display: 'feat:login-activity',
                    permission: 'loginActivity:view'
                }
            ]
        },
        {
            id: 'others',
            title: 'Другое',
            type: 'group',
            children: [
                {
                    id: 'logs',
                    title: 'Логи',
                    type: 'item',
                    url: '/logs',
                    icon: icons.IconList,
                    breadcrumbs: true,
                    display: 'feat:logs',
                    permission: 'logs:view'
                },
                // {
                //     id: 'files',
                //     title: 'Файлы',
                //     type: 'item',
                //     url: '/files',
                //     icon: icons.IconFileDatabase,
                //     breadcrumbs: true,
                //     display: 'feat:files',
                // },
                {
                    id: 'account',
                    title: 'Настройки аккаунта',
                    type: 'item',
                    url: '/account',
                    icon: icons.IconSettings,
                    breadcrumbs: true,
                    display: 'feat:account'
                }
            ]
        }
    ]
}

export default dashboard
