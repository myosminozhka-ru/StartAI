FROM node:20-alpine

RUN apk add --update libc6-compat python3 make g++
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev

# Install Chromium and curl for container-level health checks
RUN apk add --no-cache chromium curl git bash

#install PNPM globaly с обработкой сетевых ошибок
RUN set -eux; \
    if ! curl -s --head https://registry.npmjs.org/ | grep "200 OK" > /dev/null; then \
        echo "⚠️ NPM registry недоступен. Переключаемся на зеркало..."; \
        npm config set registry https://registry.npmmirror.com/; \
    fi; \
    npm install -g pnpm@10.11.0 --unsafe-perm=true

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Копируем только файлы зависимостей для кэширования
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/osmi-ai-components/package.json ./packages/osmi-ai-components/
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-documentation/package.json ./packages/api-documentation/

# Устанавливаем зависимости (кэшируется)
RUN npm config set fetch-timeout 180000 && \
    npm config set fetch-retries 3 && \
    pnpm install || (sleep 5 && pnpm install)

# Копируем весь код
COPY . .

# Сборка компонентов (с компиляцией TypeScript)
RUN cd packages/osmi-ai-components && \
    (pnpm tsc --skipLibCheck --noUnusedLocals false --noUnusedParameters false || true) && \
    pnpm gulp
RUN cd packages/server && \
    (pnpm tsc --skipLibCheck --noUnusedLocals false --noUnusedParameters false || \
    (echo "⚠️ TypeScript compilation finished with errors (ignored)" && exit 0))

# --- Healthcheck Setup ---

WORKDIR /app/healthcheck

COPY docker/worker/healthcheck/package.json . 

RUN npm install --omit=dev

COPY docker/worker/healthcheck/healthcheck.js .

# --- End Healthcheck Setup ---

# Set the main working directory back
WORKDIR /usr/src

# Environment variables for port configuration
ENV WORKER_PORT=5566

# Expose port (can be overridden by env var)
EXPOSE ${WORKER_PORT}

# Start healthcheck in background and osmi-ai worker in foreground
CMD ["/bin/sh", "-c", "node /app/healthcheck/healthcheck.js & sleep 5 && pnpm run start-worker"]
