export class Permissions {
    private categories: PermissionCategory[] = []
    constructor() {
        // const auditCategory = new PermissionCategory('audit')
        // auditCategory.addPermission(new Permission('auditLogs:view', 'Просмотр журналов аудита'))
        // this.categories.push(auditCategory)

        const chatflowsCategory = new PermissionCategory('chatflows')
        chatflowsCategory.addPermission(new Permission('chatflows:view', 'Просмотр'))
        chatflowsCategory.addPermission(new Permission('chatflows:create', 'Создать'))
        chatflowsCategory.addPermission(new Permission('chatflows:update', 'Обновить'))
        chatflowsCategory.addPermission(new Permission('chatflows:duplicate', 'Дублировать'))
        chatflowsCategory.addPermission(new Permission('chatflows:delete', 'Удалить'))
        chatflowsCategory.addPermission(new Permission('chatflows:export', 'Экспортировать'))
        chatflowsCategory.addPermission(new Permission('chatflows:import', 'Импортировать'))
        chatflowsCategory.addPermission(new Permission('chatflows:config', 'Редактировать конфигурацию'))
        chatflowsCategory.addPermission(new Permission('chatflows:domains', 'Разрешённые домены'))
        this.categories.push(chatflowsCategory)

        const agentflowsCategory = new PermissionCategory('agentflows')
        agentflowsCategory.addPermission(new Permission('agentflows:view', 'Просмотр'))
        agentflowsCategory.addPermission(new Permission('agentflows:create', 'Создать'))
        agentflowsCategory.addPermission(new Permission('agentflows:update', 'Обновить'))
        agentflowsCategory.addPermission(new Permission('agentflows:duplicate', 'Дублировать'))
        agentflowsCategory.addPermission(new Permission('agentflows:delete', 'Удалить'))
        agentflowsCategory.addPermission(new Permission('agentflows:export', 'Экспортировать'))
        agentflowsCategory.addPermission(new Permission('agentflows:import', 'Импортировать'))
        agentflowsCategory.addPermission(new Permission('agentflows:config', 'Редактировать конфигурацию'))
        agentflowsCategory.addPermission(new Permission('agentflows:domains', 'Разрешённые домены'))
        this.categories.push(agentflowsCategory)

        const toolsCategory = new PermissionCategory('tools')
        toolsCategory.addPermission(new Permission('tools:view', 'Просмотр'))
        toolsCategory.addPermission(new Permission('tools:create', 'Создать'))
        toolsCategory.addPermission(new Permission('tools:update', 'Обновить'))
        toolsCategory.addPermission(new Permission('tools:delete', 'Удалить'))
        toolsCategory.addPermission(new Permission('tools:export', 'Экспортировать'))
        this.categories.push(toolsCategory)

        const assistantsCategory = new PermissionCategory('assistants')
        assistantsCategory.addPermission(new Permission('assistants:view', 'Просмотр'))
        assistantsCategory.addPermission(new Permission('assistants:create', 'Создать'))
        assistantsCategory.addPermission(new Permission('assistants:update', 'Обновить'))
        assistantsCategory.addPermission(new Permission('assistants:delete', 'Удалить'))
        this.categories.push(assistantsCategory)

        const credentialsCategory = new PermissionCategory('credentials')
        credentialsCategory.addPermission(new Permission('credentials:view', 'Просмотр'))
        credentialsCategory.addPermission(new Permission('credentials:create', 'Создать'))
        credentialsCategory.addPermission(new Permission('credentials:update', 'Обновить'))
        credentialsCategory.addPermission(new Permission('credentials:delete', 'Удалить'))
        credentialsCategory.addPermission(new Permission('credentials:share', 'Поделиться'))
        this.categories.push(credentialsCategory)

        const variablesCategory = new PermissionCategory('variables')
        variablesCategory.addPermission(new Permission('variables:view', 'Просмотр'))
        variablesCategory.addPermission(new Permission('variables:create', 'Создать'))
        variablesCategory.addPermission(new Permission('variables:update', 'Обновить'))
        variablesCategory.addPermission(new Permission('variables:delete', 'Удалить'))
        this.categories.push(variablesCategory)

        const apikeysCategory = new PermissionCategory('apikeys')
        apikeysCategory.addPermission(new Permission('apikeys:view', 'Просмотр'))
        apikeysCategory.addPermission(new Permission('apikeys:create', 'Создать'))
        apikeysCategory.addPermission(new Permission('apikeys:update', 'Обновить'))
        apikeysCategory.addPermission(new Permission('apikeys:delete', 'Удалить'))
        apikeysCategory.addPermission(new Permission('apikeys:import', 'Импортировать'))
        this.categories.push(apikeysCategory)

        const documentStoresCategory = new PermissionCategory('documentStores')
        documentStoresCategory.addPermission(new Permission('documentStores:view', 'Просмотр'))
        documentStoresCategory.addPermission(new Permission('documentStores:create', 'Создать'))
        documentStoresCategory.addPermission(new Permission('documentStores:update', 'Обновить'))
        documentStoresCategory.addPermission(new Permission('documentStores:delete', 'Удалить хранилище документов'))
        documentStoresCategory.addPermission(new Permission('documentStores:add-loader', 'Добавить загрузчик документов'))
        documentStoresCategory.addPermission(new Permission('documentStores:delete-loader', 'Удалить загрузчик документов'))
        documentStoresCategory.addPermission(new Permission('documentStores:preview-process', 'Просмотр и обработка фрагментов документов'))
        documentStoresCategory.addPermission(new Permission('documentStores:upsert-config', 'Обновить конфигурацию'))
        this.categories.push(documentStoresCategory)

        const datasetsCategory = new PermissionCategory('datasets')
        datasetsCategory.addPermission(new Permission('datasets:view', 'Просмотр'))
        datasetsCategory.addPermission(new Permission('datasets:create', 'Создать'))
        datasetsCategory.addPermission(new Permission('datasets:update', 'Обновить'))
        datasetsCategory.addPermission(new Permission('datasets:delete', 'Удалить'))
        this.categories.push(datasetsCategory)

        const executionsCategory = new PermissionCategory('executions')
        executionsCategory.addPermission(new Permission('executions:view', 'Просмотр'))
        executionsCategory.addPermission(new Permission('executions:delete', 'Удалить'))
        this.categories.push(executionsCategory)

        const evaluatorsCategory = new PermissionCategory('evaluators')
        evaluatorsCategory.addPermission(new Permission('evaluators:view', 'Просмотр'))
        evaluatorsCategory.addPermission(new Permission('evaluators:create', 'Создать'))
        evaluatorsCategory.addPermission(new Permission('evaluators:update', 'Обновить'))
        evaluatorsCategory.addPermission(new Permission('evaluators:delete', 'Удалить'))
        this.categories.push(evaluatorsCategory)

        const evaluationsCategory = new PermissionCategory('evaluations')
        evaluationsCategory.addPermission(new Permission('evaluations:view', 'Просмотр'))
        evaluationsCategory.addPermission(new Permission('evaluations:create', 'Создать'))
        evaluationsCategory.addPermission(new Permission('evaluations:update', 'Обновить'))
        evaluationsCategory.addPermission(new Permission('evaluations:delete', 'Удалить'))
        evaluationsCategory.addPermission(new Permission('evaluations:run', 'Запустить снова'))
        this.categories.push(evaluationsCategory)

        const templatesCategory = new PermissionCategory('templates')
        templatesCategory.addPermission(new Permission('templates:marketplace', 'Просмотр шаблонов из маркетплейса'))
        templatesCategory.addPermission(new Permission('templates:custom', 'Просмотр пользовательских шаблонов'))
        templatesCategory.addPermission(new Permission('templates:custom-delete', 'Удалить пользовательский шаблон'))
        templatesCategory.addPermission(new Permission('templates:toolexport', 'Экспортировать инструмент как шаблон'))
        templatesCategory.addPermission(new Permission('templates:flowexport', 'Экспортировать поток как шаблон'))
        templatesCategory.addPermission(new Permission('templates:custom-share', 'Поделиться пользовательскими шаблонами'))
        this.categories.push(templatesCategory)

        const workspaceCategory = new PermissionCategory('workspace')
        workspaceCategory.addPermission(new Permission('workspace:view', 'Просмотр'))
        workspaceCategory.addPermission(new Permission('workspace:create', 'Создать'))
        workspaceCategory.addPermission(new Permission('workspace:update', 'Обновить'))
        workspaceCategory.addPermission(new Permission('workspace:add-user', 'Добавить'))
        workspaceCategory.addPermission(new Permission('workspace:unlink-user', 'Удалить пользователя'))
        workspaceCategory.addPermission(new Permission('workspace:delete', 'Удалить'))
        workspaceCategory.addPermission(new Permission('workspace:export', 'Экспортировать данные рабочего пространства'))
        workspaceCategory.addPermission(new Permission('workspace:import', 'Импортировать данные рабочего пространства'))
        this.categories.push(workspaceCategory)

        const adminCategory = new PermissionCategory('admin')
        adminCategory.addPermission(new Permission('users:manage', 'Управление пользователями'))
        adminCategory.addPermission(new Permission('roles:manage', 'Управление ролями'))
        adminCategory.addPermission(new Permission('sso:manage', 'Управление SSO'))
        this.categories.push(adminCategory)

        const logsCategory = new PermissionCategory('logs')
        logsCategory.addPermission(new Permission('logs:view', 'Просмотр логов', true))
        this.categories.push(logsCategory)

        const loginActivityCategory = new PermissionCategory('loginActivity')
        loginActivityCategory.addPermission(new Permission('loginActivity:view', 'Просмотр активности входа', true))
        loginActivityCategory.addPermission(new Permission('loginActivity:delete', 'Удалить активность входа', true))
        this.categories.push(loginActivityCategory)
    }

    public toJSON(): { [key: string]: { key: string; value: string }[] } {
        return this.categories.reduce((acc, category) => {
            return {
                ...acc,
                ...category.toJSON()
            }
        }, {})
    }
}

export class PermissionCategory {
    public permissions: any[] = []

    constructor(public category: string) {}

    addPermission(permission: Permission) {
        this.permissions.push(permission)
    }
    public toJSON() {
        return {
            [this.category]: [...this.permissions.map((permission) => permission.toJSON())]
        }
    }
}

export class Permission {
    constructor(public name: string, public description: string, public isEnterprise: boolean = false) {}

    public toJSON() {
        return {
            key: this.name,
            value: this.description,
            isEnterprise: this.isEnterprise
        }
    }
}
