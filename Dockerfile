FROM node:20-alpine

RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    build-base \
    cairo-dev \
    pango-dev \
    chromium \
    curl \
    git \
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
    npm install -g pnpm@10.11.0 --unsafe-perm=true; \
    pnpm -v

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Копируем весь код
COPY . .

RUN pnpm install --no-frozen-lockfile

RUN cd packages/osmi-ai-components && (pnpm tsc || true) && pnpm gulp

RUN pnpm build

EXPOSE 3000

CMD [ "pnpm", "start" ]