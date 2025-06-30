import * as handlebars from 'handlebars'
import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'path'
import { Platform } from '../../Interface'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT as string, 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SENDER_EMAIL = process.env.SENDER_EMAIL
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true
const TLS = process.env.ALLOW_UNAUTHORIZED_CERTS ? { rejectUnauthorized: false } : undefined

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE ?? true,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD
    },
    tls: TLS
})

const getEmailTemplate = (defaultTemplateName: string, userTemplatePath?: string) => {
    try {
        if (userTemplatePath) {
            return fs.readFileSync(userTemplatePath, 'utf8')
        }
    } catch (error) {
        console.warn(`Не удалось загрузить пользовательский шаблон из ${userTemplatePath}, возвращение к дефолту`)
    }
    return fs.readFileSync(path.join(__dirname, '../', 'emails', defaultTemplateName), 'utf8')
}

const sendWorkspaceAdd = async (email: string, workspaceName: string, dashboardLink: string) => {
    let htmlToSend
    let textContent

    const template = getEmailTemplate('workspace_add_cloud.hbs', process.env.WORKSPACE_INVITE_TEMPLATE_PATH)
    const compiledWorkspaceInviteTemplateSource = handlebars.compile(template)
    htmlToSend = compiledWorkspaceInviteTemplateSource({ workspaceName, dashboardLink })
    textContent = `Вас добавили в рабочее пространство ${workspaceName}. Перейдите по ссылке, чтобы открыть вашу панель управления: ${dashboardLink}` // plain text body

    await transporter.sendMail({
        from: SENDER_EMAIL || '"OsmiAI Team" <info@myosminozhka.ru>', // sender address
        to: email,
        subject: `Вы были добавлены в ${workspaceName}`, // Subject line
        text: textContent, // plain text body
        html: htmlToSend // html body
    })
}

const sendWorkspaceInvite = async (
    email: string,
    workspaceName: string,
    registerLink: string,
    platform: Platform = Platform.ENTERPRISE,
    inviteType: 'new' | 'update' = 'new'
) => {
    let htmlToSend
    let textContent

    const template =
        platform === Platform.ENTERPRISE
            ? getEmailTemplate(
                  inviteType === 'new' ? 'workspace_new_invite_enterprise.hbs' : 'workspace_update_invite_enterprise.hbs',
                  process.env.WORKSPACE_INVITE_TEMPLATE_PATH
              )
            : getEmailTemplate(
                  inviteType === 'new' ? 'workspace_new_invite_cloud.hbs' : 'workspace_update_invite_cloud.hbs',
                  process.env.WORKSPACE_INVITE_TEMPLATE_PATH
              )
    const compiledWorkspaceInviteTemplateSource = handlebars.compile(template)
    htmlToSend = compiledWorkspaceInviteTemplateSource({ workspaceName, registerLink })
    textContent = `Вас пригласили в рабочее пространство ${workspaceName}. Перейдите по ссылке, чтобы зарегистрироваться: ${registerLink}` // plain text body

    await transporter.sendMail({
        from: SENDER_EMAIL || '"OsmiAI Team" <info@myosminozhka.ru>', // sender address
        to: email,
        subject: `Вы были приглашены на ${workspaceName}`, // Subject line
        text: textContent, // plain text body
        html: htmlToSend // html body
    })
}

const sendPasswordResetEmail = async (email: string, resetLink: string) => {
    const passwordResetTemplateSource = fs.readFileSync(path.join(__dirname, '../', 'emails', 'workspace_user_reset_password.hbs'), 'utf8')
    const compiledPasswordResetTemplateSource = handlebars.compile(passwordResetTemplateSource)

    const htmlToSend = compiledPasswordResetTemplateSource({ resetLink })
    await transporter.sendMail({
        from: SENDER_EMAIL || '"OsmiAI Team" <info@myosminozhka.ru>', // sender address
        to: email,
        subject: 'Сбросьте свой пароль', // Subject line
        text: `Вы запросили ссылку для сброса пароля. Перейдите по ссылке, чтобы сбросить пароль: ${resetLink}`, // plain text body
        html: htmlToSend // html body
    })
}

const sendVerificationEmailForCloud = async (email: string, verificationLink: string) => {
    let htmlToSend
    let textContent

    const template = getEmailTemplate('verify_email_cloud.hbs')
    const compiledWorkspaceInviteTemplateSource = handlebars.compile(template)
    htmlToSend = compiledWorkspaceInviteTemplateSource({ verificationLink })
    textContent = `Чтобы завершить регистрацию, необходимо подтвердить ваш адрес электронной почты. Перейдите по ссылке для подтверждения: ${verificationLink}` // plain text body

    await transporter.sendMail({
        from: SENDER_EMAIL || '"OsmiAI Team" <info@myosminozhka.ru>', // sender address
        to: email,
        subject: 'Необходимые действия: Пожалуйста, подтвердите свой адрес электронной почты', // Subject line
        text: textContent, // plain text body
        html: htmlToSend // html body
    })
}

export { sendWorkspaceAdd, sendWorkspaceInvite, sendPasswordResetEmail, sendVerificationEmailForCloud }
