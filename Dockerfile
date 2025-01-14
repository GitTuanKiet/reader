FROM debian:bullseye-slim AS base

# Install Chrome
RUN apt-get update && apt-get install dumb-init gnupg wget -y && \
    wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install google-chrome-stable -y --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY backend/functions/package*.json ./

RUN npm ci --production --omit=dev

COPY backend/functions .

ENV NODE_ENV=production
RUN npm run build

FROM base AS crawler

WORKDIR /usr/src/app

COPY --from=builder /app/build ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["dumb-init", "node", "api/crawler.js"]

FROM base AS searcher

WORKDIR /usr/src/app

COPY --from=builder /app/build ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/

ENV NODE_ENV=production

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["dumb-init", "node", "api/searcher.js"]