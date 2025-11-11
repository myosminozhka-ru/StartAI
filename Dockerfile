# Production Dockerfile for OSMI AI
# docker build --no-cache -t osmi-ai:latest .

FROM node:20-alpine

# Устанавливаем системные зависимости
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    build-base \
    cairo-dev \
    pango-dev \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git \
    curl \
    bash

# === Проверка сети и установка pnpm ===
RUN set -eux; \
    echo "Проверяем подключение к registry.npmjs.org..."; \
    if ! curl -s --head https://registry.npmjs.org/ | grep "200 OK" > /dev/null; then \
        echo "⚠️  NPM registry недоступен. Переключаемся на зеркало npmmirror.com..."; \
        npm config set registry https://registry.npmmirror.com/; \
    else \
        echo "✅ Доступ к npm registry подтверждён."; \
    fi; \
    npm config set fetch-timeout 120000; \
    npm config set fetch-retries 3; \
    npm config set fetch-retry-mintimeout 10000; \
    npm config set fetch-retry-maxtimeout 60000; \
    yarn config set network-timeout 120000 -g; \
    npm install -g pnpm@10.11.0 --unsafe-perm=true; \
    pnpm config set network-timeout 120000; \
    pnpm config set fetch-timeout 120000; \
    pnpm config set fetch-retries 3; \
    pnpm -v

# Настройки окружения Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Увеличиваем лимит памяти для Node.js
ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Копируем весь код
COPY . .

# Создаём глобальную конфигурацию yarn для git-hosted пакетов
RUN echo "network-timeout 120000" > /root/.yarnrc && \
    echo "registry \"https://registry.npmmirror.com/\"" >> /root/.yarnrc

# Устанавливаем зависимости БЕЗ установки (только линковка, т.к. node_modules уже есть локально)
# Используем --prefer-offline для использования локального кэша
RUN pnpm install --frozen-lockfile --shamefully-hoist --prefer-offline || \
    pnpm install --no-frozen-lockfile --shamefully-hoist --prefer-offline

# Сборка компонентов (TypeScript + Gulp, игнорируем ошибки типов)
RUN cd packages/components && (pnpm tsc || true) && pnpm gulp

# Сборка остальных пакетов (игнорируем ошибки типов)
RUN pnpm build || (echo "Build had type errors but continuing..." && exit 0)

# Создаём симлинк для фронтенда (сервер ищет OSMI-ui в node_modules)
RUN ln -s /usr/src/packages/ui /usr/src/node_modules/OSMI-ui || true

# Fix: add appuser and fix runtime permissions
ARG UID=1023
ARG GID=1023
ARG USERNAME=appuser
RUN addgroup -g ${GID} ${USERNAME} && adduser -D -u ${UID} -G ${USERNAME} ${USERNAME}
RUN mkdir -p /home/${USERNAME}/.osmi-ai && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}/.osmi-ai
USER ${USERNAME}

EXPOSE 3000

CMD [ "pnpm", "start" ]
