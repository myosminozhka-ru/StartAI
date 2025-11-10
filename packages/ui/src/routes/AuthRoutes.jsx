import { lazy } from 'react'

import Loadable from '@/ui-component/loading/Loadable'
import AuthLayout from '@/layout/AuthLayout'

const ResolveLoginPage = Loadable(lazy(() => import('@/views/auth/login')))
const SignInPage = Loadable(lazy(() => import('@/views/auth/signIn')))
const RegisterPage = Loadable(lazy(() => import('@/views/auth/register')))
const SimpleRegisterPage = Loadable(lazy(() => import('@/views/auth/simpleRegister')))
const VerifyEmailPage = Loadable(lazy(() => import('@/views/auth/verify-email')))
const ForgotPasswordPage = Loadable(lazy(() => import('@/views/auth/forgotPassword')))
const ResetPasswordPage = Loadable(lazy(() => import('@/views/auth/resetPassword')))
const UnauthorizedPage = Loadable(lazy(() => import('@/views/auth/unauthorized')))
const LicenseExpiredPage = Loadable(lazy(() => import('@/views/auth/expired')))
const EulaPage = Loadable(lazy(() => import('@/views/auth/eula')))

const AuthRoutes = {
    path: '/',
    element: <AuthLayout />,
    children: [
        {
            path: '/login',
            element: <ResolveLoginPage />
        },
        {
            path: '/signin',
            element: <SignInPage />
        },
        {
            path: '/register',
            element: <RegisterPage />
        },
        {
            path: '/simple-register',
            element: <SimpleRegisterPage />
        },
        {
            path: '/verify',
            element: <VerifyEmailPage />
        },
        {
            path: '/forgot-password',
            element: <ForgotPasswordPage />
        },
        {
            path: '/reset-password',
            element: <ResetPasswordPage />
        },
        {
            path: '/unauthorized',
            element: <UnauthorizedPage />
        },
        {
            path: '/license-expired',
            element: <LicenseExpiredPage />
        }
    ]
}

export default AuthRoutes
