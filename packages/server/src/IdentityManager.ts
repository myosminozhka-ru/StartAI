/**
 * Copyright (c) 2023-present OSMIAI, Inc.
 *
 * The Enterprise and Cloud versions of OSMI are licensed under the [Commercial License](https://github.com/OSMIAI/OSMI/tree/main/packages/server/src/enterprise/LICENSE.md).
 * Unauthorized copying, modification, distribution, or use of the Enterprise and Cloud versions is strictly prohibited without a valid license agreement from OSMIAI, Inc.
 *
 * The Open Source version is licensed under the Apache License, Version 2.0 (the "License")
 *
 * For information about licensing of the Enterprise and Cloud versions, please contact:
 * security@OSMIai.com
 */

import axios from 'axios'
import express, { Application, NextFunction, Request, Response } from 'express'
import * as fs from 'fs'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import path from 'path'
import { LoginMethodStatus } from './enterprise/database/entities/login-method.entity'
import { ErrorMessage, LoggedInUser } from './enterprise/Interface.Enterprise'
import { Permissions } from './enterprise/rbac/Permissions'
// Enterprise сервисы закомментированы в minimal версии
// import { LoginMethodService } from './enterprise/services/login-method.service'
// import { OrganizationService } from './enterprise/services/organization.service'
// SSO удален в minimal версии
// import Auth0SSO from './enterprise/sso/Auth0SSO'
// import AzureSSO from './enterprise/sso/AzureSSO'
// import GithubSSO from './enterprise/sso/GithubSSO'
// import GoogleSSO from './enterprise/sso/GoogleSSO'
// import SSOBase from './enterprise/sso/SSOBase'
import { InternalOsmiError } from './errors/InternalOsmiError'
import { Platform, UserPlan } from './Interface'
import { StripeManager } from './StripeManager'
import { UsageCacheManager } from './UsageCacheManager'
import { GeneralErrorMessage, LICENSE_QUOTAS } from './utils/constants'
import { getRunningExpressApp } from './utils/getRunningExpressApp'
import { ENTERPRISE_FEATURE_FLAGS } from './utils/quotaUsage'
import Stripe from 'stripe'

// SSO удален в minimal версии
// const allSSOProviders = ['azure', 'google', 'auth0', 'github']
export class IdentityManager {
    private static instance: IdentityManager
    private stripeManager?: StripeManager
    licenseValid: boolean = false
    permissions: Permissions
    ssoProviderName: string = ''
    currentInstancePlatform: Platform = Platform.OPEN_SOURCE
    // SSO удален в minimal версии
    // create a map to store the sso provider name and the sso provider instance
    // ssoProviders: Map<string, SSOBase> = new Map()

    public static async getInstance(): Promise<IdentityManager> {
        if (!IdentityManager.instance) {
            IdentityManager.instance = new IdentityManager()
            await IdentityManager.instance.initialize()
        }
        return IdentityManager.instance
    }

    public async initialize() {
        await this._validateLicenseKey()
        this.permissions = new Permissions()
        if (process.env.STRIPE_SECRET_KEY) {
            this.stripeManager = await StripeManager.getInstance()
        }
    }

    public getPlatformType = () => {
        return this.currentInstancePlatform
    }

    public getPermissions = () => {
        return this.permissions
    }

    public isEnterprise = () => {
        return this.currentInstancePlatform === Platform.ENTERPRISE
    }

    public isCloud = () => {
        return this.currentInstancePlatform === Platform.CLOUD
    }

    public isOpenSource = () => {
        return this.currentInstancePlatform === Platform.OPEN_SOURCE
    }

    public isLicenseValid = () => {
        return this.licenseValid
    }

    private _offlineVerifyLicense(licenseKey: string): any {
        try {
            const publicKey = fs.readFileSync(path.join(__dirname, '../', 'src/enterprise/license/public.pem'), 'utf8')
            const decoded = jwt.verify(licenseKey, publicKey, {
                algorithms: ['RS256']
            })
            return decoded
        } catch (error) {
            console.error('Error verifying license key:', error)
            // В dev режиме или при отключенной проверке просто декодируем без верификации подписи
            if (process.env.NODE_ENV === 'development' || process.env.DISABLE_LICENSE_VERIFICATION === 'true') {
                try {
                    console.log('🔓 License signature verification disabled - decoding without verification')
                    return jwt.decode(licenseKey)
                } catch (decodeError) {
                    console.error('Error decoding license key:', decodeError)
                    return null
                }
            }
            return null
        }
    }

    public _findLicenseKey(): { key: string | null; source: string } {
        // Поиск лицензионного ключа в переменных окружения
        // Поддерживается только специфичная legacy переменная
        const legacyPatterns = ['_EE_LICENSE_KEY']

        // Проверяем legacy переменные в определенном порядке
        const knownLegacyVars = Object.keys(process.env)
            .filter((key) => legacyPatterns.some((pattern) => key.endsWith(pattern)))
            .sort() // Сортируем для предсказуемости

        for (const envKey of knownLegacyVars) {
            const envValue = process.env[envKey]
            if (envValue) {
                return { key: envValue, source: `${envKey} (legacy compatibility)` }
            }
        }

        return { key: null, source: 'none' }
    }

    private _validateLicenseKey = async () => {
        const LICENSE_URL = process.env.LICENSE_URL

        // Автоматическое определение лицензионного ключа
        const { key: LICENSE_KEY, source } = this._findLicenseKey()

        // Логирование используемой переменной для отладки
        if (LICENSE_KEY) {
            console.log(`🔑 Using ${source} for enterprise license`)
        }

        // First check if license key is missing
        if (!LICENSE_KEY) {
            console.log('❌ No enterprise license key found. Running in Open Source mode.')
            this.licenseValid = false
            this.currentInstancePlatform = Platform.OPEN_SOURCE
            return
        }

        try {
            if (process.env.OFFLINE === 'true') {
                const decodedLicense = this._offlineVerifyLicense(LICENSE_KEY)

                if (!decodedLicense) {
                    this.licenseValid = false
                } else {
                    const issuedAtSeconds = decodedLicense.iat
                    if (!issuedAtSeconds) {
                        this.licenseValid = false
                    } else {
                        // Используем стандартное JWT exp поле если доступно
                        if (decodedLicense.exp) {
                            const expiresAt = new Date(decodedLicense.exp * 1000)
                            if (new Date() > expiresAt) {
                                this.licenseValid = false
                            } else {
                                this.licenseValid = true
                            }
                        } else if (decodedLicense.expiryDurationInMonths) {
                            // Fallback к старой логике с expiryDurationInMonths
                            const issuedAt = new Date(issuedAtSeconds * 1000)
                            const expiryDurationInMonths = decodedLicense.expiryDurationInMonths

                            const expiryDate = new Date(issuedAt)
                            expiryDate.setMonth(expiryDate.getMonth() + expiryDurationInMonths)

                            if (new Date() > expiryDate) {
                                this.licenseValid = false
                            } else {
                                this.licenseValid = true
                            }
                        } else {
                            // Если ни exp, ни expiryDurationInMonths нет, считаем лицензию действительной
                            this.licenseValid = true
                        }
                    }
                }
                this.currentInstancePlatform = Platform.ENTERPRISE
            } else if (LICENSE_URL) {
                try {
                    const response = await axios.post(`${LICENSE_URL}/enterprise/verify`, { license: LICENSE_KEY })
                    this.licenseValid = response.data?.valid

                    if (!LICENSE_URL.includes('api')) this.currentInstancePlatform = Platform.ENTERPRISE
                    else if (LICENSE_URL.includes('v1')) this.currentInstancePlatform = Platform.ENTERPRISE
                    else if (LICENSE_URL.includes('v2')) this.currentInstancePlatform = response.data?.platform
                    else throw new InternalOsmiError(StatusCodes.INTERNAL_SERVER_ERROR, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
                } catch (error) {
                    console.error('Error verifying license key:', error)
                    this.licenseValid = false
                    this.currentInstancePlatform = Platform.ENTERPRISE
                    return
                }
            }
        } catch (error) {
            this.licenseValid = false
        }
    }

    // Enterprise SSO закомментирован в minimal версии
    public initializeSSO = async (app: express.Application) => {
        // Заглушка - SSO не используется в minimal версии
        /*
        if (this.getPlatformType() === Platform.CLOUD || this.getPlatformType() === Platform.ENTERPRISE) {
            const loginMethodService = new LoginMethodService()
            let queryRunner
            try {
                queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
                await queryRunner.connect()
                let organizationId = undefined
                if (this.getPlatformType() === Platform.ENTERPRISE) {
                    const organizationService = new OrganizationService()
                    const organizations = await organizationService.readOrganization(queryRunner)
                    if (organizations.length > 0) {
                        organizationId = organizations[0].id
                    } else {
                        this.initializeEmptySSO(app)
                        return
                    }
                }
                const loginMethods = await loginMethodService.readLoginMethodByOrganizationId(organizationId, queryRunner)
                if (loginMethods && loginMethods.length > 0) {
                    for (let method of loginMethods) {
                        if (method.status === LoginMethodStatus.ENABLE) {
                            method.config = JSON.parse(await loginMethodService.decryptLoginMethodConfig(method.config))
                            this.initializeSsoProvider(app, method.name, method.config)
                        }
                    }
                }
            } finally {
                if (queryRunner) await queryRunner.release()
            }
        }
        // iterate through the remaining providers and initialize them with configEnabled as false
        this.initializeEmptySSO(app)
        */
    }

    // SSO удален в minimal версии
    initializeEmptySSO(app: Application) {
        // Заглушка - SSO не используется
    }

    initializeSsoProvider(app: Application, providerName: string, providerConfig: any) {
        // Заглушка - SSO не используется
    }

    async getRefreshToken(providerName: any, ssoRefreshToken: string) {
        // Заглушка - SSO не используется
        return null
    }

    public async getProductIdFromSubscription(subscriptionId: string) {
        if (!subscriptionId) return ''
        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        return await this.stripeManager.getProductIdFromSubscription(subscriptionId)
    }

    public async getFeaturesByPlan(subscriptionId: string, withoutCache: boolean = false) {
        if (this.isEnterprise()) {
            const features: Record<string, string> = {}
            for (const feature of ENTERPRISE_FEATURE_FLAGS) {
                features[feature] = 'true'
            }
            return features
        } else if (this.isCloud()) {
            if (!this.stripeManager || !subscriptionId) {
                return {}
            }
            return await this.stripeManager.getFeaturesByPlan(subscriptionId, withoutCache)
        }
        return {}
    }

    public static checkFeatureByPlan(feature: string) {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = req.user
            if (user) {
                if (!user.features || Object.keys(user.features).length === 0) {
                    return res.status(403).json({ message: ErrorMessage.FORBIDDEN })
                }
                if (Object.keys(user.features).includes(feature) && user.features[feature] === 'true') {
                    return next()
                }
            }
            return res.status(403).json({ message: ErrorMessage.FORBIDDEN })
        }
    }

    public async createStripeCustomerPortalSession(req: Request) {
        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        return await this.stripeManager.createStripeCustomerPortalSession(req)
    }

    public async getAdditionalSeatsQuantity(subscriptionId: string) {
        if (!subscriptionId) return {}
        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        return await this.stripeManager.getAdditionalSeatsQuantity(subscriptionId)
    }

    public async getCustomerWithDefaultSource(customerId: string) {
        if (!customerId) return
        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        return await this.stripeManager.getCustomerWithDefaultSource(customerId)
    }

    public async getAdditionalSeatsProration(subscriptionId: string, newQuantity: number) {
        if (!subscriptionId) return {}
        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        return await this.stripeManager.getAdditionalSeatsProration(subscriptionId, newQuantity)
    }

    public async updateAdditionalSeats(subscriptionId: string, quantity: number, prorationDate: number) {
        if (!subscriptionId) return {}

        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        const { success, subscription, invoice } = await this.stripeManager.updateAdditionalSeats(subscriptionId, quantity, prorationDate)

        // Fetch product details to get quotas
        const items = subscription.items.data
        if (items.length === 0) {
            throw new Error('No subscription items found')
        }

        const productId = items[0].price.product as string
        const product = await this.stripeManager.getStripe().products.retrieve(productId)
        const productMetadata = product.metadata

        // Extract quotas from metadata
        const quotas: Record<string, number> = {}
        for (const key in productMetadata) {
            if (key.startsWith('quota:')) {
                quotas[key] = parseInt(productMetadata[key])
            }
        }
        quotas[LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT] = quantity

        // Get features from Stripe
        const features = await this.getFeaturesByPlan(subscription.id, true)

        // Update the cache with new subscription data including quotas
        const cacheManager = await UsageCacheManager.getInstance()
        await cacheManager.updateSubscriptionDataToCache(subscriptionId, {
            features,
            quotas,
            subsriptionDetails: this.stripeManager.getSubscriptionObject(subscription)
        })

        return { success, subscription, invoice }
    }

    public async getPlanProration(subscriptionId: string, newPlanId: string) {
        if (!subscriptionId || !newPlanId) return {}

        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        return await this.stripeManager.getPlanProration(subscriptionId, newPlanId)
    }

    public async updateSubscriptionPlan(req: Request, subscriptionId: string, newPlanId: string, prorationDate: number) {
        if (!subscriptionId || !newPlanId) return {}

        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }
        if (!req.user) {
            throw new InternalOsmiError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)
        }
        const { success, subscription } = await this.stripeManager.updateSubscriptionPlan(subscriptionId, newPlanId, prorationDate)
        if (success) {
            // Fetch product details to get quotas
            const product = await this.stripeManager.getStripe().products.retrieve(newPlanId)
            const productMetadata = product.metadata

            // Extract quotas from metadata
            const quotas: Record<string, number> = {}
            for (const key in productMetadata) {
                if (key.startsWith('quota:')) {
                    quotas[key] = parseInt(productMetadata[key])
                }
            }

            const additionalSeatsItem = subscription.items.data.find(
                (item) => (item.price.product as string) === process.env.ADDITIONAL_SEAT_ID
            )
            quotas[LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT] = additionalSeatsItem?.quantity || 0

            // Get features from Stripe
            const features = await this.getFeaturesByPlan(subscription.id, true)

            // Update the cache with new subscription data including quotas
            const cacheManager = await UsageCacheManager.getInstance()

            const updateCacheData: Record<string, any> = {
                features,
                quotas,
                subsriptionDetails: this.stripeManager.getSubscriptionObject(subscription)
            }

            if (
                newPlanId === process.env.CLOUD_FREE_ID ||
                newPlanId === process.env.CLOUD_STARTER_ID ||
                newPlanId === process.env.CLOUD_PRO_ID
            ) {
                updateCacheData.productId = newPlanId
            }

            await cacheManager.updateSubscriptionDataToCache(subscriptionId, updateCacheData)

            const loggedInUser: LoggedInUser = {
                ...req.user,
                activeOrganizationSubscriptionId: subscription.id,
                features
            }

            if (
                newPlanId === process.env.CLOUD_FREE_ID ||
                newPlanId === process.env.CLOUD_STARTER_ID ||
                newPlanId === process.env.CLOUD_PRO_ID
            ) {
                loggedInUser.activeOrganizationProductId = newPlanId
            }

            req.user = {
                ...req.user,
                ...loggedInUser
            }

            // Update passport session
            // @ts-ignore
            req.session.passport.user = {
                ...req.user,
                ...loggedInUser
            }

            req.session.save((err) => {
                if (err) throw new InternalOsmiError(StatusCodes.BAD_REQUEST, GeneralErrorMessage.UNHANDLED_EDGE_CASE)
            })

            return {
                status: 'success',
                user: loggedInUser
            }
        }
        return {
            status: 'error',
            message: 'Payment or subscription update not completed'
        }
    }

    public async createStripeUserAndSubscribe({ email, userPlan, referral }: { email: string; userPlan: UserPlan; referral?: string }) {
        if (!this.stripeManager) {
            throw new Error('Stripe manager is not initialized')
        }

        try {
            // Create a customer in Stripe
            let customer: Stripe.Response<Stripe.Customer>
            if (referral) {
                customer = await this.stripeManager.getStripe().customers.create({
                    email: email,
                    metadata: {
                        referral
                    }
                })
            } else {
                customer = await this.stripeManager.getStripe().customers.create({
                    email: email
                })
            }

            let productId = ''
            switch (userPlan) {
                case UserPlan.STARTER:
                    productId = process.env.CLOUD_STARTER_ID as string
                    break
                case UserPlan.PRO:
                    productId = process.env.CLOUD_PRO_ID as string
                    break
                case UserPlan.FREE:
                    productId = process.env.CLOUD_FREE_ID as string
                    break
            }

            // Get the default price ID for the product
            const prices = await this.stripeManager.getStripe().prices.list({
                product: productId,
                active: true,
                limit: 1
            })

            if (!prices.data.length) {
                throw new Error('No active price found for the product')
            }

            // Create the subscription
            const subscription = await this.stripeManager.getStripe().subscriptions.create({
                customer: customer.id,
                items: [{ price: prices.data[0].id }]
            })

            return {
                customerId: customer.id,
                subscriptionId: subscription.id
            }
        } catch (error) {
            console.error('Error creating Stripe user and subscription:', error)
            throw error
        }
    }
}
