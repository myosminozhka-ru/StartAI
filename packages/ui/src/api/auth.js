import client from './client'

// auth
const resolveLogin = (body) => client.post(`/auth/resolve`, body)
const login = (body) => client.post(`/auth/simple-login`, body) // Изменено на простой логин
const simpleRegister = (body) => client.post(`/auth/simple-register`, body) // Простая регистрация

// permissions
const getAllPermissions = () => client.get(`/auth/permissions`)
const ssoSuccess = (token) => client.get(`/auth/sso-success?token=${token}`)

export default {
    resolveLogin,
    login,
    simpleRegister,
    getAllPermissions,
    ssoSuccess
}
