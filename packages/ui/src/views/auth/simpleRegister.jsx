import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// material-ui
import { Stack, useTheme, Typography, Box, Alert } from '@mui/material'
import { IconExclamationCircle, IconCheck } from '@tabler/icons-react'
import { LoadingButton } from '@mui/lab'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { Input } from '@/ui-component/input/Input'

// API
import authApi from '@/api/auth'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// ==============================|| SimpleRegisterPage ||============================== //

const SimpleRegisterPage = () => {
    const theme = useTheme()
    useNotifier()

    const nameInput = {
        label: 'Имя',
        name: 'name',
        type: 'text',
        placeholder: 'Ваше имя'
    }
    const emailInput = {
        label: 'Email',
        name: 'email',
        type: 'email',
        placeholder: 'user@company.com'
    }
    const passwordInput = {
        label: 'Пароль',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }
    const confirmPasswordInput = {
        label: 'Подтверждение пароля',
        name: 'confirmPassword',
        type: 'password',
        placeholder: '********'
    }

    const [nameVal, setNameVal] = useState('')
    const [emailVal, setEmailVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
    const [authError, setAuthError] = useState(undefined)
    const [loading, setLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [eulaAccepted, setEulaAccepted] = useState(false)

    const navigate = useNavigate()
    const registerApi = useApi(authApi.simpleRegister)

    const doRegister = (event) => {
        event.preventDefault()
        setAuthError(undefined)

        // Валидация
        if (!nameVal || !emailVal || !passwordVal || !confirmPasswordVal) {
            setAuthError('Все поля обязательны для заполнения')
            return
        }

        if (passwordVal !== confirmPasswordVal) {
            setAuthError('Пароли не совпадают')
            return
        }

        if (passwordVal.length < 8) {
            setAuthError('Пароль должен содержать минимум 8 символов')
            return
        }

        // Проверяем согласие с EULA
        if (!eulaAccepted) {
            setAuthError('Необходимо принять условия Лицензионного соглашения для продолжения')
            return
        }

        setLoading(true)
        const body = {
            name: nameVal,
            email: emailVal,
            password: passwordVal
        }
        registerApi.request(body)
    }

    useEffect(() => {
        if (registerApi.error) {
            setLoading(false)
            setAuthError(registerApi.error.message || 'Произошла ошибка при регистрации')
        }
    }, [registerApi.error])

    useEffect(() => {
        if (registerApi.data) {
            setLoading(false)
            if (registerApi.data.success) {
                setSuccessMessage('Регистрация прошла успешно! Перенаправление на страницу входа...')
                setTimeout(() => {
                    navigate('/signin')
                }, 2000)
            }
        }
    }, [registerApi.data, navigate])

    return (
        <>
            <MainCard maxWidth='sm'>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {successMessage && (
                        <Alert icon={<IconCheck />} variant='filled' severity='success' onClose={() => setSuccessMessage('')}>
                            {successMessage}
                        </Alert>
                    )}
                    {authError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authError}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Регистрация</Typography>
                        <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                            Уже есть аккаунт?{' '}
                            <Link style={{ color: `${theme.palette.primary.main}` }} to='/signin'>
                                Войти
                            </Link>
                            .
                        </Typography>
                    </Stack>
                    <form onSubmit={doRegister}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Имя<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={nameInput}
                                    onChange={(newValue) => setNameVal(newValue)}
                                    value={nameVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={emailInput}
                                    onChange={(newValue) => setEmailVal(newValue)}
                                    value={emailVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Пароль<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input inputParam={passwordInput} onChange={(newValue) => setPasswordVal(newValue)} value={passwordVal} />
                                <Typography variant='caption' sx={{ color: theme.palette.grey[600], mt: 0.5 }}>
                                    Минимум 8 символов
                                </Typography>
                            </Box>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Подтверждение пароля<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={confirmPasswordInput}
                                    onChange={(newValue) => setConfirmPasswordVal(newValue)}
                                    value={confirmPasswordVal}
                                />
                            </Box>

                            {/* Чекбокс согласия с EULA */}
                            <Box sx={{ p: 0 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        minHeight: '18px'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '18px',
                                            height: '18px',
                                            border: '2px solid #9E9E9E',
                                            borderRadius: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            backgroundColor: eulaAccepted ? '#2196F3' : 'transparent',
                                            borderColor: eulaAccepted ? '#2196F3' : '#9E9E9E',
                                            marginTop: '-1px',
                                            flexShrink: 0
                                        }}
                                        onClick={() => setEulaAccepted(!eulaAccepted)}
                                    >
                                        {eulaAccepted && (
                                            <svg
                                                width='12'
                                                height='10'
                                                viewBox='0 0 12 10'
                                                fill='none'
                                                xmlns='http://www.w3.org/2000/svg'
                                                style={{ marginTop: '1px' }}
                                            >
                                                <path
                                                    d='M10.5 1.5L4.5 7.5L1.5 4.5'
                                                    stroke='white'
                                                    strokeWidth='2'
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                />
                                            </svg>
                                        )}
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontFamily: 'Inter',
                                            fontWeight: 400,
                                            fontSize: '14px',
                                            lineHeight: '17px',
                                            color: '#212121',
                                            flex: 1
                                        }}
                                    >
                                        Я принимаю условия{' '}
                                        <a
                                            href='/soglashenie'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            style={{
                                                color: '#2196F3',
                                                textDecoration: 'underline',
                                                fontFamily: 'Inter',
                                                fontWeight: 400,
                                                fontSize: '14px',
                                                lineHeight: '17px'
                                            }}
                                        >
                                            Лицензионного соглашения
                                        </a>
                                    </Typography>
                                </Box>
                            </Box>

                            <LoadingButton
                                loading={loading}
                                variant='contained'
                                style={{ borderRadius: 12, height: 40, marginRight: 5 }}
                                type='submit'
                            >
                                Зарегистрироваться
                            </LoadingButton>
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
        </>
    )
}

export default SimpleRegisterPage



