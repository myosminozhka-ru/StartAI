# Инструкции по настройке MWS интеграции

## Быстрый старт

### 1. Установка зависимостей
```bash
cd packages/osmi-ai-components
npm install
```

### 2. Сборка проекта
```bash
npm run build
```

### 3. Тестирование API MWS
```bash
cd ../../
node test_mws_integration.js
```

### 4. Запуск OSMI
```bash
npm run start
```

## Проверка интеграции

После запуска OSMI:

1. **Создайте учетные данные MWS:**
   - Перейдите в раздел "Credentials"
   - Нажмите "Add Credential"
   - Выберите "MWS API"
   - Введите API ключ: `4uRDvbtCf5o6B7WHtIFR`

2. **Проверьте доступность узлов:**
   - В разделе "Chat Models" должен появиться "ChatMWS"
   - В разделе "Embeddings" должен появиться "MWS Embeddings"

3. **Создайте тестовый пайплайн:**
   - Добавьте узел ChatMWS
   - Подключите учетные данные
   - Выберите модель (например, gpt-4o-mini)
   - Протестируйте работу

## Созданные файлы

### Основные компоненты:
- `credentials/MWSApi.credential.ts` - Учетные данные MWS
- `nodes/chatmodels/ChatMWS/` - LLM узел
- `nodes/embeddings/MWSEmbedding/` - Embeddings узел
- `src/mwsModelLoader.ts` - Утилиты для загрузки моделей

### Конфигурация:
- `models.json` - Обновлен с моделями MWS
- `MWS_INTEGRATION_README.md` - Полная документация
- `test_mws_integration.js` - Тестовый скрипт

## API Credentials

**MWS API:**
- API Key: `4uRDvbtCf5o6B7WHtIFR`
- Base URL: `https://api.gpt.mws.ru/v1`

**MWS UI (для тестирования):**
- URL: https://ui.gpt.mws.ru/login
- Login: `Dneustroev@sk.ru`
- Password: `4uRDvbtCf5o6B7WHtIFR`

## Устранение проблем

### Узлы не отображаются
1. Убедитесь, что проект собран: `npm run build`
2. Перезапустите сервер OSMI
3. Проверьте логи на ошибки

### Ошибки API
1. Проверьте доступность https://api.gpt.mws.ru/v1/models
2. Убедитесь в корректности API ключа
3. Проверьте подключение к интернету

### Проблемы с моделями
1. Запустите тест: `node test_mws_integration.js`
2. Проверьте, что API возвращает список моделей
3. В случае проблем используются дефолтные модели из `models.json`

## Совместимость

Узлы MWS полностью совместимы с существующими пайплайнами OpenAI:
- Используют тот же интерфейс
- Поддерживают все стандартные параметры
- Переключение требует только смены узла и учетных данных
