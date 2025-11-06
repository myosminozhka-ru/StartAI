# Build OSMI AI production image
# docker build --no-cache -t osmi-ai/osmi-ai:latest .

# Run OSMI AI container
# docker run -d -p 3000:3000 osmi-ai/osmi-ai:latest

FROM node:20-alpine
RUN apk add --update libc6-compat python3 make g++
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev

# Install Chromium
RUN apk add --no-cache chromium

# Install git for GitHub dependencies
RUN apk add --no-cache git

RUN apk add --no-cache curl

#install PNPM globaly
RUN npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package.json files from all packages
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy app source
COPY . .

RUN pnpm build

EXPOSE 3000

CMD [ "pnpm", "start" ]
