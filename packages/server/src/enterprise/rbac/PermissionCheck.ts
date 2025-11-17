// Заглушка для minimal версии
// Enterprise функции проверки прав доступа

export const checkAnyPermission = (...permissions: string[]) => {
    return (req: any, res: any, next: any) => {
        // В minimal версии без RBAC просто пропускаем
        next()
    }
}

export const checkPermission = (permission: string) => {
    return (req: any, res: any, next: any) => {
        // В minimal версии без RBAC просто пропускаем
        next()
    }
}








