FROM node:20-alpine
RUN apk add --update libc6-compat python3 make g++
# needed for pdfjs-dist
RUN apk add --no-cache build-base \
    cairo-dev \
    pango-dev \ 
    libheif-dev \
    libde265-dev \
    chromium \
    curl \
    git

#install PNPM globaly using mirror
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com/

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Copy app source
COPY . .

RUN pnpm install

RUN pnpm build

# Create required directories for logs and data
RUN mkdir -p /home/demouser/.osmi-ai/logs /root/.osmi-ai/logs

# # Fix: add appuser and fix runtime permissions
# ARG UID=1023
# ARG GID=1023
# ARG USERNAME=appuser
# RUN addgroup -g ${GID} ${USERNAME} && adduser -D -u ${UID} -G ${USERNAME} ${USERNAME}
# RUN mkdir -p /home/${USERNAME}/.osmi-ai && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}/.osmi-ai
# USER ${USERNAME}

EXPOSE 3000

CMD [ "pnpm", "start" ]