import express from 'express'
import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import bcrypt from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { User, UserStatus } from '../enterprise/database/entities/user.entity'
import { Organization } from '../enterprise/database/entities/organization.entity'
import { Workspace } from '../enterprise/database/entities/workspace.entity'
import { encryptToken } from '../enterprise/utils/tempTokenUtils'

const router = express.Router()

const jwtAuthTokenSecret = process.env.JWT_AUTH_TOKEN_SECRET || 'auth_token'
const jwtRefreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET || process.env.JWT_AUTH_TOKEN_SECRET || 'refresh_token'
const jwtAudience = 'AUDIENCE'  // Должно совпадать с passport/index.ts
const jwtIssuer = 'ISSUER'      // Должно совпадать с passport/index.ts
const secureCookie = process.env.SECURE_COOKIES === 'false' ? false : process.env.SECURE_COOKIES === 'true' ? true : process.env.APP_URL?.startsWith('https') ? true : false

const generateJwtToken = (userId: string, workspaceId: string, name: string, expiryInMinutes: number, secret: string) => {
    const encryptedUserInfo = encryptToken(userId + ':' + workspaceId)
    return sign({ id: userId, username: name, meta: encryptedUserInfo }, secret, {
        expiresIn: `${expiryInMinutes}m`,
        notBefore: 0,
        algorithm: 'HS256',
        audience: jwtAudience,
        issuer: jwtIssuer
    })
}

// Простая регистрация без организаций и ролей
router.post('/simple-register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Name, email and password are required'
            })
        }

        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            // Проверяем, существует ли пользователь
            const existingUser = await queryRunner.manager.findOne(User, {
                where: { email: email.toLowerCase() }
            })

            if (existingUser) {
                await queryRunner.rollbackTransaction()
                return res.status(StatusCodes.CONFLICT).json({
                    success: false,
                    message: 'User with this email already exists'
                })
            }

            // Хешируем пароль
            const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '10'))
            const hashedPassword = bcrypt.hashSync(password, salt)

            // Создаем организацию для пользователя (используем общую для minimal версии)
            let organization = await queryRunner.manager.findOne(Organization, {
                where: { name: 'Default Organization' }
            })
            
            if (!organization) {
                organization = new Organization()
                organization.name = 'Default Organization'
                organization.createdDate = new Date()
                organization.updatedDate = new Date()
                await queryRunner.manager.save(organization)
            }

            // Создаем отдельный workspace для пользователя
            const workspace = new Workspace()
            workspace.name = `${name}'s Workspace`
            workspace.organizationId = organization.id!
            workspace.createdDate = new Date()
            workspace.updatedDate = new Date()
            await queryRunner.manager.save(workspace)

            // Создаем пользователя
            const user = new User()
            user.name = name
            user.email = email.toLowerCase()
            user.credential = hashedPassword
            user.status = UserStatus.ACTIVE
            user.role = 'admin'
            user.activeWorkspaceId = workspace.id

            await queryRunner.manager.save(user)
            await queryRunner.commitTransaction()

            // Удаляем чувствительные данные перед отправкой
            delete user.credential
            delete user.tempToken
            delete user.tokenExpiry

            return res.status(StatusCodes.CREATED).json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    status: user.status
                }
            })
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    } catch (error) {
        next(error)
    }
})

// Простой логин без workspace
router.post('/simple-login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Email and password are required'
            })
        }

        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            // Ищем пользователя без relations
            const user = await queryRunner.manager
                .createQueryBuilder(User, 'user')
                .where('user.email = :email', { email: email.toLowerCase() })
                .getOne()

            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'User not found'
                })
            }

            if (!user.credential) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid credentials'
                })
            }

            // Проверяем пароль
            const isPasswordValid = bcrypt.compareSync(password, user.credential)
            if (!isPasswordValid) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Invalid email or password'
                })
            }

            if (user.status !== UserStatus.ACTIVE) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'User account is not active'
                })
            }

            // Получаем workspace ID, преобразуя UUID в строку если нужно
            const workspaceId = user.activeWorkspaceId ? String(user.activeWorkspaceId) : ''
            
            // Создаем упрощенный объект пользователя для сессии
            const loggedInUser = {
                id: user.id || '',
                email: user.email || '',
                name: user.name || '',
                activeWorkspaceId: workspaceId,
                activeOrganizationId: '',
                activeOrganizationSubscriptionId: '',
                activeOrganizationCustomerId: '',
                activeOrganizationProductId: '',
                roleId: '',
                permissions: [],
                features: {},
                isOrganizationAdmin: true,
                activeWorkspace: 'Default Workspace',
                assignedWorkspaces: [],
                isApiKeyValidated: false
            }

            // Создаем JWT токены
            const authTokenExpiry = parseInt(process.env.JWT_AUTH_TOKEN_EXPIRY_IN_MINUTES || '60')
            const refreshTokenExpiry = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES || '10080') // 7 days
            
            const authToken = generateJwtToken(user.id!, workspaceId, user.name || '', authTokenExpiry, jwtAuthTokenSecret)
            const refreshToken = generateJwtToken(user.id!, workspaceId, user.name || '', refreshTokenExpiry, jwtRefreshSecret)

            // Устанавливаем cookies
            res.cookie('token', authToken, {
                maxAge: authTokenExpiry * 60 * 1000,
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax'
            })
            
            res.cookie('refreshToken', refreshToken, {
                maxAge: refreshTokenExpiry * 60 * 1000,
                httpOnly: true,
                secure: secureCookie,
                sameSite: 'lax'
            })

            // Сохраняем в сессию через passport.login
            req.login(loggedInUser as any, { session: true }, (loginErr) => {
                if (loginErr) {
                    return next(loginErr)
                }

                // Удаляем чувствительные данные
                delete user.credential
                delete user.tempToken
                delete user.tokenExpiry

                return res.status(StatusCodes.OK).json({
                    ...loggedInUser,
                    email: user.email,
                    name: user.name
                })
            })
        } finally {
            await queryRunner.release()
        }
    } catch (error) {
        next(error)
    }
})

export default router

