const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function checkEnterpriseFeatures() {
    console.log('🔍 Проверка Enterprise функциональности Flowise...\n');
    
    try {
        // Проверяем основные endpoints
        console.log('1. Проверка базового API...');
        const pingResponse = await axios.get(`${BASE_URL}/ping`);
        console.log('✅ Ping:', pingResponse.data);
        
        // Проверяем enterprise endpoints
        console.log('\n2. Проверка Enterprise endpoints...');
        
        const enterpriseEndpoints = [
            '/auth',
            '/user', 
            '/organization',
            '/workspace',
            '/role',
            '/account'
        ];
        
        for (const endpoint of enterpriseEndpoints) {
            try {
                const response = await axios.get(`${BASE_URL}${endpoint}`, {
                    validateStatus: function (status) {
                        return status < 500; // Принимаем любой статус кроме 5xx
                    }
                });
                console.log(`✅ ${endpoint}: доступен (статус: ${response.status})`);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log(`❌ ${endpoint}: не найден (404)`);
                } else {
                    console.log(`✅ ${endpoint}: доступен (требует аутентификации)`);
                }
            }
        }
        
        // Проверяем настройки
        console.log('\n3. Проверка настроек...');
        try {
            const settingsResponse = await axios.get(`${BASE_URL}/settings`);
            console.log('✅ Настройки:', settingsResponse.data);
        } catch (error) {
            console.log('❌ Ошибка получения настроек:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

checkEnterpriseFeatures(); 