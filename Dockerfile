FROM debian:bullseye-slim AS base

# Install Chrome
RUN apt-get update && apt-get install dumb-init gnupg wget -y && \
    wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install google-chrome-stable -y --no-install-recommends && \
    apt-get purge --auto-remove -y curl && \
    rm -rf /var/lib/apt/lists/*

FROM node:20-bullseye-slim AS builder

# install and build
RUN mkdir -p /temp/dev
COPY backend/functions ./temp/dev/
RUN cd /temp/dev && npm ci

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY backend/functions/package*.json ./temp/prod/
RUN cd /temp/prod && npm ci --production --omit=dev

# build
ENV NODE_ENV=production
RUN cd /temp/dev && npm run build

FROM base AS crawl
WORKDIR /usr/src/app

COPY --from=builder /temp/prod/node_modules /usr/src/app/node_modules
COPY --from=builder /temp/dev/build /usr/src/app
COPY --from=builder /usr/local/bin/node /usr/local/bin/
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD ["dumb-init", "node", "server.js"]