import { JwtFromRequestFunction, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt'
import { decryptToken } from '../../utils/tempTokenUtils'
import { Strategy } from 'passport'
import { Request } from 'express'
import { ICommonObject } from 'osmi-ai-components'

const _cookieExtractor = (req: any) => {
    let jwt = null

    if (req && req.cookies) {
        jwt = req.cookies['token']
    }

    return jwt
}

export const getAuthStrategy = (options: any): Strategy => {
    let jwtFromRequest: JwtFromRequestFunction
    jwtFromRequest = _cookieExtractor
    const jwtOptions = {
        jwtFromRequest: jwtFromRequest,
        passReqToCallback: true,
        ...options
    }
    const jwtVerify = async (req: Request, payload: ICommonObject, done: VerifiedCallback) => {
        try {
            const meta = decryptToken(payload.meta)
            if (!meta) {
                return done(null, false, 'Unauthorized.')
            }
            const ids = meta.split(':')
            if (ids.length !== 2 || payload.id !== ids[0]) {
                return done(null, false, 'Unauthorized.')
            }
            
            // Если req.user уже есть (из сессии), используем его
            if (req.user && req.user.id === payload.id) {
                return done(null, req.user)
            }
            
            // Создаем упрощенный user object из payload для minimal версии
            const minimalUser = {
                id: payload.id,
                name: payload.username,
                email: payload.email || '',
                activeWorkspaceId: ids[1] || '',
                activeOrganizationId: '',
                activeWorkspace: 'Default Workspace',
                roleId: '',
                permissions: [],
                features: [],
                assignedWorkspaces: [],
                isOrganizationAdmin: true,
                isApiKeyValidated: false
            }
            
            done(null, minimalUser)
        } catch (error) {
            done(error, false)
        }
    }
    return new JwtStrategy(jwtOptions, jwtVerify)
}
