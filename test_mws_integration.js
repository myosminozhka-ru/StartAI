/**
 * Тестовый скрипт для проверки интеграции MWS API
 * Запуск: node test_mws_integration.js
 */

const axios = require('axios');

// Попробуем разные варианты ключей на основе ТЗ
const MWS_API_KEYS = [
    // Оригинальные ключи из ТЗ
    '4uRDvbtCf5o6B7WHtIFR',           // Креды МТС
    'iNii9jMSng8QCoryGTZgug',         // Логин
    // Варианты с префиксом sk- (для LiteLLM)
    'sk-4uRDvbtCf5o6B7WHtIFR',
    'sk-iNii9jMSng8QCoryGTZgug',
    // Возможно, нужна комбинация логин:пароль
    'sk-' + Buffer.from('iNii9jMSng8QCoryGTZgug:4uRDvbtCf5o6B7WHtIFR').toString('base64'),
    // Или просто base64
    Buffer.from('iNii9jMSng8QCoryGTZgug:4uRDvbtCf5o6B7WHtIFR').toString('base64')
];

let MWS_API_KEY = MWS_API_KEYS[0];
const MWS_BASE_URL = 'https://api.gpt.mws.ru/v1';

async function testMWSModels() {
    console.log('🔍 Тестирование получения списка моделей MWS...');
    
    try {
        const response = await axios.get(`${MWS_BASE_URL}/models`, {
            headers: {
                'Authorization': `Bearer ${MWS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.status === 200 && response.data) {
            console.log('✅ Успешно получен список моделей:');
            console.log(JSON.stringify(response.data, null, 2));
            return response.data;
        } else {
            throw new Error('Неверный ответ от API');
        }
    } catch (error) {
        console.error('❌ Ошибка при получении списка моделей:', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Данные:', error.response.data);
        }
        return null;
    }
}

async function testMWSChat() {
    console.log('\n💬 Тестирование Chat Completions...');
    
    try {
        const response = await axios.post(`${MWS_BASE_URL}/chat/completions`, {
            model: 'mws-gpt-alpha',
            messages: [
                {
                    role: 'user',
                    content: 'Привет! Как дела? Ответь кратко.'
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${MWS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 200 && response.data) {
            console.log('✅ Успешный ответ от чата:');
            console.log('Модель:', response.data.model);
            console.log('Ответ:', response.data.choices[0].message.content);
            console.log('Использовано токенов:', response.data.usage);
            return response.data;
        } else {
            throw new Error('Неверный ответ от API');
        }
    } catch (error) {
        console.error('❌ Ошибка при тестировании чата:', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Данные:', error.response.data);
        }
        return null;
    }
}

async function testMWSEmbeddings() {
    console.log('\n🔢 Тестирование Embeddings...');
    
    try {
        const response = await axios.post(`${MWS_BASE_URL}/embeddings`, {
            model: 'bge-m3',
            input: 'Тестовый текст для создания эмбеддинга'
        }, {
            headers: {
                'Authorization': `Bearer ${MWS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.status === 200 && response.data) {
            console.log('✅ Успешно создан эмбеддинг:');
            console.log('Модель:', response.data.model);
            console.log('Размерность:', response.data.data[0].embedding.length);
            console.log('Первые 5 значений:', response.data.data[0].embedding.slice(0, 5));
            console.log('Использовано токенов:', response.data.usage);
            return response.data;
        } else {
            throw new Error('Неверный ответ от API');
        }
    } catch (error) {
        console.error('❌ Ошибка при тестировании эмбеддингов:', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Данные:', error.response.data);
        }
        return null;
    }
}

async function testAllKeys() {
    console.log('🔑 Тестирование всех вариантов API ключей и методов аутентификации...\n');
    
    // Тестируем Bearer токены
    for (let i = 0; i < MWS_API_KEYS.length; i++) {
        MWS_API_KEY = MWS_API_KEYS[i];
        console.log(`\n🔍 Тестируем Bearer ключ ${i + 1}/${MWS_API_KEYS.length}: ${MWS_API_KEY.substring(0, 20)}...`);
        
        try {
            const response = await axios.get(`${MWS_BASE_URL}/models`, {
                headers: {
                    'Authorization': `Bearer ${MWS_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            if (response.status === 200) {
                console.log('✅ Bearer ключ работает! Найден рабочий API ключ.');
                return { key: MWS_API_KEY, method: 'Bearer' };
            }
        } catch (error) {
            console.log(`❌ Bearer не работает: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
        }
    }
    
    // Тестируем Basic Auth с логином и паролем из ТЗ
    console.log('\n🔐 Тестируем Basic Auth с логином и паролем...');
    const username = 'iNii9jMSng8QCoryGTZgug';
    const password = '4uRDvbtCf5o6B7WHtIFR';
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    
    try {
        const response = await axios.get(`${MWS_BASE_URL}/models`, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.status === 200) {
            console.log('✅ Basic Auth работает!');
            return { key: basicAuth, method: 'Basic' };
        }
    } catch (error) {
        console.log(`❌ Basic Auth не работает: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
    }
    
    // Тестируем API Key в заголовке
    console.log('\n🔑 Тестируем API Key в заголовке...');
    const apiKeys = ['4uRDvbtCf5o6B7WHtIFR', 'iNii9jMSng8QCoryGTZgug'];
    
    for (const key of apiKeys) {
        try {
            const response = await axios.get(`${MWS_BASE_URL}/models`, {
                headers: {
                    'X-API-Key': key,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            if (response.status === 200) {
                console.log('✅ X-API-Key работает!');
                return { key: key, method: 'X-API-Key' };
            }
        } catch (error) {
            console.log(`❌ X-API-Key ${key.substring(0, 10)}... не работает: ${error.response?.status}`);
        }
    }
    
    console.log('\n❌ Ни один метод аутентификации не работает. Возможно, API недоступен или нужны другие креды.');
    return null;
}

async function runAllTests() {
    console.log('🚀 Запуск тестов интеграции MWS API\n');
    console.log('Base URL:', MWS_BASE_URL);
    console.log('='.repeat(50));

    // Сначала найдем рабочий ключ
    const workingAuth = await testAllKeys();
    
    if (!workingAuth) {
        console.log('\n⚠️  Не удалось найти рабочий метод аутентификации. Проверьте документацию MWS.');
        console.log('\n💡 Возможные причины:');
        console.log('   1. API недоступен или временно не работает');
        console.log('   2. Нужны другие креды или формат аутентификации');
        console.log('   3. Требуется регистрация или активация API ключа');
        console.log('   4. Изменился URL или формат API');
        return;
    }
    
    MWS_API_KEY = workingAuth.key;
    console.log('\n' + '='.repeat(50));
    console.log(`🎯 Используем рабочий метод: ${workingAuth.method}`);
    console.log(`🔑 Ключ: ${workingAuth.key.substring(0, 20)}...`);
    console.log('='.repeat(50));

    const results = {
        models: await testMWSModels(),
        chat: await testMWSChat(),
        embeddings: await testMWSEmbeddings()
    };

    console.log('\n' + '='.repeat(50));
    console.log('📊 Сводка результатов:');
    console.log('Модели:', results.models ? '✅ Успешно' : '❌ Ошибка');
    console.log('Чат:', results.chat ? '✅ Успешно' : '❌ Ошибка');
    console.log('Эмбеддинги:', results.embeddings ? '✅ Успешно' : '❌ Ошибка');

    const successCount = Object.values(results).filter(Boolean).length;
    console.log(`\n🎯 Результат: ${successCount}/3 тестов прошли успешно`);

    if (successCount === 3) {
        console.log('🎉 Все тесты прошли успешно! MWS API готов к использованию.');
    } else {
        console.log('⚠️  Некоторые тесты не прошли. Проверьте настройки и доступность API.');
    }
}

// Запуск тестов
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testMWSModels,
    testMWSChat,
    testMWSEmbeddings,
    runAllTests
};
