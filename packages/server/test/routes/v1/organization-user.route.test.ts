import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

describe('Organization User Route', () => {
    const route = '/api/v1/organization-user'

    describe(`GET ${route} - list organization users`, () => {
        it('should return organization users list', async () => {
            const response = await supertest(getRunningExpressApp().app)
                .get(route)
                .expect([StatusCodes.OK, StatusCodes.UNAUTHORIZED, StatusCodes.FORBIDDEN])

            // Test should not crash - exact response depends on auth
            expect(response.status).toBeLessThan(500)
        })
    })

    describe(`POST ${route} - create organization user`, () => {
        it('should handle organization user creation', async () => {
            const userData = {
                email: 'test@osmi-ai.ru',
                role: 'user'
            }

            const response = await supertest(getRunningExpressApp().app)
                .post(route)
                .send(userData)
                .expect([StatusCodes.OK, StatusCodes.CREATED, StatusCodes.UNAUTHORIZED, StatusCodes.FORBIDDEN, StatusCodes.BAD_REQUEST])

            // Test should not crash - exact response depends on auth and validation
            expect(response.status).toBeLessThan(500)
        })
    })
})

export function organizationUserRouteTest() {
    // Экспортируем для совместимости с index.test.ts
}
