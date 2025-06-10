const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

// Генерируем пару ключей RSA
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

// Сохраняем публичный ключ
fs.writeFileSync('packages/server/src/enterprise/license/public.pem', publicKey);

// Создаем payload для лицензии
const payload = {
    iat: Math.floor(Date.now() / 1000), // issued at
    expiryDurationInMonths: 12, // действует 12 месяцев
    company: 'Test Company',
    email: 'test@example.com'
};

// Генерируем JWT токен
const licenseKey = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

console.log('🔑 Сгенерированный лицензионный ключ:');
console.log(licenseKey);
console.log('\n📝 Для активации Enterprise режима используйте:');
console.log(`export FLOWISE_EE_LICENSE_KEY="${licenseKey}"`);
console.log('export OFFLINE=true');

// Сохраняем в файл для удобства
fs.writeFileSync('enterprise_license.txt', licenseKey);
console.log('\n💾 Лицензионный ключ сохранен в файл enterprise_license.txt'); 