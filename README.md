<!-- markdownlint-disable MD030 -->

<p align="center">
<img src="https://app.osmi-ai.ru/assets/osmi_black-VsBDPajo.png">
<img src="https://app.osmi-ai.ru/assets/osmi_black-VsBDPajo.png">
</p>

<div align="center">

[![Release Notes](https://img.shields.io/github/release/myosminozhka-ru/StartAI)](https://github.com/myosminozhka-ru/StartAI/releases)
[![GitHub star chart](https://img.shields.io/github/stars/myosminozhka-ru/StartAI?style=social)](https://star-history.com/#myosminozhka-ru/StartAI)
[![GitHub repository](https://img.shields.io/github/forks/myosminozhka-ru/StartAI?style=social)](https://github.com/myosminozhka-ru/StartAI)

</div>
<h3>Build AI Agents, Visually</h3>

<img width="100%" src="https://app.osmi-ai.ru/assets/osmi_black-VsBDPajo.png"></a>

## 📚 Table of Contents

-   [⚡ Quick Start](#-quick-start)
-   [🔥 New: MWS Integration](#-new-mws-integration)
-   [🐳 Docker](#-docker)
-   [👨‍💻 Developers](#-developers)
-   [🌱 Env Variables](#-env-variables)
-   [📖 Documentation](#-documentation)
-   [🌐 Self Host](#-self-host)
-   [☁️ OSMI IT Cloud](#️-osmi-it-cloud)
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

## 🔥 New: MWS Integration

OSMI StartAI теперь поддерживает интеграцию с **MWS (МТС) API** для использования российских языковых моделей!

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

OSMI AI has 3 different modules in a single mono repository.

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

1.  Clone the repository:

    ```bash
    git clone https://github.com/myosminozhka-ru/OSMI-AI.git
    ```

2.  Go into repository folder:

    ```bash
    cd OSMI-AI
    ```

3.  Install all dependencies of all modules:

    ```bash
    pnpm install
    ```

4.  Build all the code:

    ```bash
    pnpm build
    ```

    <details>
    <summary>Exit code 134 (JavaScript heap out of memory)</summary>  
    If you get this error when running the above `build` script, try increasing the Node.js heap size and run the script again:

    ```bash
    # macOS / Linux / Git Bash
    export NODE_OPTIONS="--max-old-space-size=4096"

    # Windows PowerShell
    $env:NODE_OPTIONS="--max-old-space-size=4096"

    # Windows CMD
    set NODE_OPTIONS=--max-old-space-size=4096
    ```

    Then run:

    ```bash
    pnpm build
    ```

    </details>

5.  Start the app:

    ```bash
    pnpm start
    ```

    You can now access the app on [http://localhost:3000](http://localhost:3000)

6.  For development build:

    -   Create `.env` file and specify the `VITE_PORT` (refer to `.env.example`) in `packages/ui`
    -   Create `.env` file and specify the `PORT` (refer to `.env.example`) in `packages/server`
    -   Run:

        ```bash
        pnpm dev
        ```

    Any code changes will reload the app automatically on [http://localhost:8080](http://localhost:8080)

## 🌱 Env Variables

OSMI AI supports different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://docs.osmi-ai.ru)

## 📖 Documentation

You can view the OSMI AI Docs [here](https://docs.osmi-ai.ru)

## 🌐 Self Host

Deploy OSMI AI self-hosted in your existing infrastructure. For deployment instructions, visit [our documentation](https://docs.osmi-ai.ru).

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
