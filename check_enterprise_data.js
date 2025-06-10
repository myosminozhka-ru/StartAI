const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function checkEnterpriseData() {
    console.log('🔍 Проверка Enterprise данных...\n');
    
    try {
        // Проверяем доступ к методам входа (не требует авторизации)
        console.log('1. Проверка методов входа...');
        try {
            const loginMethodsResponse = await axios.get(`${BASE_URL}/loginmethod`);
            console.log('✅ Методы входа:', loginMethodsResponse.data);
        } catch (error) {
            console.log('❌ Ошибка получения методов входа:', error.response?.data || error.message);
        }

        // Проверяем настройки аккаунта
        console.log('\n2. Проверка настроек аккаунта...');
        try {
            const accountResponse = await axios.get(`${BASE_URL}/account/basic-auth`);
            console.log('✅ Базовая аутентификация:', accountResponse.data);
        } catch (error) {
            console.log('❌ Ошибка настроек аккаунта:', error.response?.data || error.message);
        }

        // Попробуем создать организацию
        console.log('\n3. Попытка создать организацию...');
        try {
            const orgData = {
                orgName: 'Test Organization',
                username: 'admin',
                email: 'admin@test.com',
                password: 'Admin123!@#',
                confirmPassword: 'Admin123!@#'
            };
            
            const createOrgResponse = await axios.post(`${BASE_URL}/organization/setup`, orgData);
            console.log('✅ Организация создана:', createOrgResponse.data);
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('📝 Организация уже существует');
            } else {
                console.log('❌ Ошибка создания организации:', error.response?.data || error.message);
            }
        }

        // Проверим статус создания
        console.log('\n4. Проверка статуса setup...');
        try {
            const setupResponse = await axios.get(`${BASE_URL}/organization/setup/status`);
            console.log('✅ Статус setup:', setupResponse.data);
        } catch (error) {
            console.log('❌ Ошибка проверки setup:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ Общая ошибка:', error.message);
    }
}

checkEnterpriseData(); 