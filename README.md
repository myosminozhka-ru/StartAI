<h3>Build AI Agents, Visually</h3>

> **🎯 МИНИМАЛЬНАЯ ВЕРСИЯ ДЛЯ ОДНОГО АГЕНТА**  
> Эта ветка содержит ультра-минималистичную версию, оптимизированную для работы одного агента с базовым набором инструментов. Максимально упрощена для быстрого развертывания и использования с российским MWS API МТС.
> 
> **⚠️ ОГРАНИЧЕНИЯ:** Максимум 2 чатфлоу, только основные компоненты, без управления пользователями.


## 🌿 Ветка: minimal-single-agent-version

Эта ветка содержит **минимальную версию** для работы одного агента с базовым набором инструментов и российским MWS API МТС.

**Основные отличия от main:**
- 🔒 **Лимит:** максимум 2 чатфлоу
- 🤖 **AI:** только MWS компоненты (ChatMWS, MWS LLM, MWSEmbedding)
- 🛠️ **Инструменты:** только 7 базовых инструментов
- 👥 **Пользователи:** убрано управление пользователями и рабочими пространствами
- 📦 **Размер:** значительно уменьшен за счет удаления неиспользуемых компонентов

## 📚 Table of Contents

-   [⚡ Quick Start](#-quick-start)
-   [🎯 Minimal Single Agent Version](#-minimal-single-agent-version)
-   [🔥 New: MWS Integration](#-new-mws-integration)
-   [🐳 Docker](#-docker)
-   [👨‍💻 Developers](#-developers)
-   [🌱 Env Variables](#-env-variables)
-   [📖 Documentation](#-documentation)
-   [🌐 Self Host](#-self-host)
-   [☁️ Cloud](#️-osmi-it-cloud)
-   [🙋 Support](#-support)
-   [🙌 Contributing](#-contributing)
-   [📄 License](#-license)

## ⚡Quick Start

Download and Install [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Install
    ```bash
    pnpm install
    ```
2. Start

    ```bash
    pnpx start
    ```

3. Open [http://localhost:3000](http://localhost:3000)

## 🎯 Minimal Single Agent Version

Эта ветка содержит **ультра-минималистичную версию** OSMI StartAI, максимально упрощенную для работы одного агента.

### ✅ Что осталось в UI:
- **Чатфлоу** - создание диалоговых потоков (**ЛИМИТ: максимум 2 чатфлоу**)
- **Выполнения** - мониторинг запусков агентов
- **Инструменты** - только 7 базовых инструментов:
  - Calculator, ChatflowTool, CurrentDateTime, CustomTool, RetrieverTool, Searxng, TavilyAPI
- **Учётные данные** - безопасное хранение API ключей
- **Переменные** - управление конфигурацией
- **API ключи** - доступ к REST API
- **Хранилища документов** - работа с документами
- **Оценки** - тестирование и валидация моделей
- **Логи** - мониторинг системы
- **Настройки аккаунта** - персональные настройки

### 🤖 Компоненты AI (только MWS):
- **1 агент:** ToolAgent (Агент инструментов)
- **1 чат-модель:** ChatMWS (MWS GPT от МТС)
- **1 LLM:** MWS LLM (MWS GPT для LLM задач)
- **1 эмбеддинг:** MWSEmbedding (MWS эмбеддинги)
- **1 кэш:** RedisEmbeddingsCache
- **1 загрузчик:** DocumentStore
- **1 модерация:** SimplePromptModeration
- **1 менеджер записей:** PostgresRecordManager

### ❌ Что полностью удалено:
**UI разделы:**
- Ассистенты, Маркетплейсы
- Управление пользователями, роли, права доступа
- Рабочие пространства, организации
- SSO интеграция, активность входа

**AI компоненты:**
- Все LlamaIndex компоненты (engine, responsesynthesizer)
- Все Chains (цепочки)
- Все Утилиты
- 34+ инструментов (оставлено только 7)
- Все агенты кроме ToolAgent
- Все чат-модели кроме MWS
- Все LLM кроме MWS
- Все эмбеддинги кроме MWS
- 38 загрузчиков документов
- Последовательные агенты, графы
- Модерация OpenAI
- MySQL и SQLite менеджеры записей

### 🚀 Преимущества минимальной версии:
- **Максимальная простота** - только самое необходимое
- **Российская локализация** - работает через MWS API МТС
- **Быстрое развертывание** - минимум зависимостей
- **Ограниченный функционал** - идеально для простых задач
- **Один агент** - сосредоточенность на базовых возможностях

## 🔥 New: MWS Integration

Теперь поддерживает интеграцию с **MWS (МТС) API** для использования российских языковых моделей!

### 🚀 Возможности MWS интеграции:

- **ChatMWS узел** - доступ к мощным языковым моделям МТС
- **MWS Embeddings** - создание векторных представлений текста
- **Динамическая загрузка моделей** через API
- **Полная совместимость** с существующими пайплайнами

### 🎯 Доступные модели:

**Chat модели:**
- `mws-gpt-alpha` - основная рекомендуемая модель МТС
- `qwen2.5-32b-instruct` - мощная китайская модель
- `llama-3.3-70b-instruct` - новая модель Meta

**Embedding модели:**
- `bge-m3` - универсальная многоязычная модель
- `BAAI/bge-multilingual-gemma2` - продвинутая модель для эмбеддингов

### 📚 Документация:

- [🧪 Руководство по тестированию MWS](./MWS_TESTING_GUIDE.md)
- [📖 Инструкции по настройке MWS](./MWS_SETUP_INSTRUCTIONS.md)
- [🔧 Техническая документация MWS](./MWS_INTEGRATION_README.md)

### ⚡ Быстрый старт с MWS:

1. Создайте **MWS API credential** в разделе "Учетные записи"
2. Добавьте узел **ChatMWS** в ваш чатфлоу
3. Настройте модель `mws-gpt-alpha` и протестируйте!

## 🐳 Docker

### Docker Compose

1. Clone project
2. Go to `docker` folder at the root of the project
3. Copy `.env.example` file, paste it into the same location, and rename to `.env` file
4. `docker compose up -d`
5. Open [http://localhost:3000](http://localhost:3000)
6. You can bring the containers down by `docker compose stop`

### Docker Image

1. Build the image locally:

    ```bash
    docker build --no-cache -t osmi-ai .
    ```

2. Run image:

    ```bash
    docker run -d --name osmi-ai -p 3000:3000 osmi-ai
    ```

3. Stop image:

    ```bash
    docker stop osmi-ai
    ```

## 👨‍💻 Developers

Has 3 different modules in a single mono repository.

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Third-party nodes integrations
-   `api-documentation`: Auto-generated swagger-ui API docs from express

### Prerequisite

-   Install [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### Setup

1. Перейдите в директорию docker:
   ```bash
   cd docker
   ```

2. Создайте копию `.env.example` и переименуйте в `.env`:
   ```bash
   cp .env.example .env
   ```

3. Откройте файл `.env` и раскомментируйте/заполните необходимые настройки подключения к БД:
   ```bash
   # Тип базы данных
   DATABASE_TYPE=postgres
   
   # DATABASE_PATH - закомментируйте, не используется для PostgreSQL
   # DATABASE_PATH=...
   
   # Настройки PostgreSQL
   DATABASE_PORT=
   DATABASE_HOST
   DATABASE_NAME=
   DATABASE_USER=
   DATABASE_PASSWORD=
   ```

4. Запустите сборку контейнеров:
   ```bash
   docker-compose -f docker-compose-queue-source.yml up -d --build
   ```

5. Дождитесь запуска всех контейнеров (~1-2 минуты). Проверить статус можно командой:
   ```bash
   docker ps
   ```

6. **Откройте приложение в браузере:**
   - **Регистрация**: `http://localhost:3000/simple-register`
   - **Вход**: `http://localhost:3000/signin`


## 🌱 Env Variables

Supports different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://docs.osmi-ai.ru)

## 📖 Documentation

You can view the Docs [here](https://docs.osmi-ai.ru)

## 🌐 Self Host

Deploy self-hosted in your existing infrastructure. For deployment instructions, visit [our documentation](https://docs.osmi-ai.ru).

## ☁️ OSMI IT Cloud

Get Started with [OSMI IT Cloud](https://app.osmi-ai.ru).

## 🙋 Support

Feel free to ask any questions, raise problems, and request new features in [Discussion](https://github.com/myosminozhka-ru/OSMI-AI/discussions).

## 🙌 Contributing

Thanks go to these awesome contributors

<a href="https://github.com/myosminozhka-ru/OSMI-AI/graphs/contributors">
<img src="https://contrib.rocks/image?repo=myosminozhka-ru/OSMI-AI" />
</a><br><br>

See [Contributing Guide](CONTRIBUTING.md). For questions or issues, please create an issue in our repository.

[![Star History Chart](https://api.star-history.com/svg?repos=myosminozhka-ru/OSMI-AI&type=Timeline)](https://star-history.com/#myosminozhka-ru/OSMI-AI&Date)

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](LICENSE.md).
