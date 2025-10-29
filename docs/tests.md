# 🧪 Тестирование OSMI AI

Полное руководство по запуску всех типов тестов в проекте OSMI AI.

## 📋 Типы тестов

### 🔧 Unit тесты

-   **Компоненты:** `packages/osmi-ai-components/`
-   **Фреймворк:** Jest + TypeScript
-   **Покрытие:** Основные утилиты и обработчики

### 🌐 E2E тесты

-   **Инструмент:** Cypress
-   **Браузеры:** Chrome, Firefox, Edge
-   **Сценарии:** Полные пользовательские флоу

### 🔌 API тесты

-   **Инструмент:** Jest + Supertest
-   **Покрытие:** REST API, форк osmi-ai-embed-react
-   **Аутентификация:** JWT токены

## 🚀 Локальный запуск

### Все тесты сразу

```bash
# Корень проекта
pnpm test

# С покрытием
pnpm test:coverage
```

### Unit тесты

```bash
# Components
cd packages/osmi-ai-components
pnpm test
pnpm test:watch
pnpm test:coverage

# Server unit тесты (без зависимости от сервера)
cd packages/server
pnpm test:unit

# Все тесты с покрытием
pnpm test:coverage
```

### E2E тесты

```bash
cd packages/server

# Интерактивный режим
pnpm cypress:open

# Headless режим
pnpm cypress:run

# С запуском сервера
pnpm e2e
```

### API тесты

```bash
cd packages/server

# API тесты (требуют запущенный сервер)
pnpm test:api

# Простые unit тесты (без сервера)
pnpm test:unit
```

## ⚙️ CI/CD (GitHub Actions)

### Автоматический запуск

-   **Push в main:** Полный тест-сьют
-   **Pull Request:** Unit + API тесты
-   **Nightly:** E2E + нагрузочные тесты

### Workflow файлы

-   `.github/workflows/osmi-ai-ci.yml` - Основной CI
-   `.github/workflows/osmi-ai-tests.yml` - Расширенные тесты

### Артефакты

-   **Покрытие кода:** `coverage/`
-   **Скриншоты E2E:** `cypress/screenshots/`
-   **Видео тестов:** `cypress/videos/`
-   **Отчёты:** `test-results/`

## 🔧 Настройка окружения

### Переменные среды

```bash
# .env.test
NODE_ENV=test
DATABASE_TYPE=sqlite
DATABASE_PATH=:memory:
OSMI_AI_USERNAME=test
OSMI_AI_PASSWORD=test123
```

### База данных

```bash
# Тестовая БД (SQLite в памяти)
npm run db:test:setup
```

## 📊 Покрытие кода

### Цели покрытия

-   **Unit тесты:** >80%
-   **API тесты:** >70%
-   **E2E тесты:** Критические флоу

### Отчёты

```bash
# Генерация отчёта
pnpm test:coverage

# Просмотр в браузере
open coverage/lcov-report/index.html
```

## 🐛 Отладка тестов

### Jest отладка

```bash
# Debug режим
pnpm test --debug

# Конкретный тест
pnpm test handler.test.ts --verbose
```

### Cypress отладка

```bash
# С логами
DEBUG=cypress:* pnpm cypress:run

# Пошаговое выполнение
pnpm cypress:open --config video=true
```

## 🚨 Troubleshooting

### Частые проблемы

**Node.js 22 - динамические импорты:**

```bash
# Для локального запуска с Node.js 22
export NODE_OPTIONS="--experimental-vm-modules"
pnpm test

# Или для Windows
set NODE_OPTIONS=--experimental-vm-modules && pnpm test
```

**Тесты падают локально:**

```bash
# Очистка кэша
pnpm test:clean
rm -rf node_modules/.cache

# Пересборка
pnpm build
```

**Cypress не запускается:**

```bash
# Переустановка
pnpm cypress install --force
```

**API тесты таймаут:**

```bash
# Увеличить таймаут в jest.config.js
testTimeout: 30000
```

## 📝 Написание тестов

### Unit тест (Jest)

```typescript
// example.test.ts
import { myFunction } from './myFunction'

describe('MyFunction', () => {
    it('should return expected result', () => {
        const result = myFunction('input')
        expect(result).toBe('expected')
    })
})
```

### API тест (Supertest)

```typescript
// api.test.ts
import supertest from 'supertest'
import { app } from '../src/app'

describe('API Tests', () => {
    it('should return 200 for health check', async () => {
        await supertest(app).get('/api/v1/health').expect(200)
    })
})
```

### E2E тест (Cypress)

```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
    it('should login successfully', () => {
        cy.visit('/login')
        cy.get('[data-cy=username]').type('test')
        cy.get('[data-cy=password]').type('test123')
        cy.get('[data-cy=submit]').click()
        cy.url().should('include', '/dashboard')
    })
})
```

## 🎯 Лучшие практики

### Структура тестов

-   **Arrange:** Подготовка данных
-   **Act:** Выполнение действия
-   **Assert:** Проверка результата

### Именование

-   Описательные имена тестов
-   Группировка по функциональности
-   Использование `describe` и `it`

### Моки и стабы

-   Изоляция внешних зависимостей
-   Предсказуемые тестовые данные
-   Очистка после тестов

## 📈 Метрики и мониторинг

### Время выполнения

-   **Unit:** <5 секунд
-   **API:** <30 секунд
-   **E2E:** <5 минут

### Стабильность

-   **Flaky тесты:** <5%
-   **Success rate:** >95%

---

**Автор:** OSMI Team  
**Обновлено:** $(date)  
**Версия:** 1.0.0
