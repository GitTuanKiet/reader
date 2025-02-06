FROM lwthiker/curl-impersonate:0.6-chrome-slim-bullseye

FROM node:20 AS builder

WORKDIR /temp/dev

COPY backend/functions/package.json backend/functions/package-lock.json ./
RUN npm ci

COPY backend/functions ./
RUN npm run build

WORKDIR /temp/prod

COPY backend/functions/package.json backend/functions/package-lock.json ./
RUN npm ci --production --omit=dev

FROM node:20 AS base

# Install Chrome and required fonts
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=0 /usr/local/lib/libcurl-impersonate.so /usr/local/lib/libcurl-impersonate.so

# RUN groupadd -r jina
# RUN useradd -g jina  -G audio,video -m jina
# USER jina

WORKDIR /usr/src/app

COPY --from=builder /temp/dev/build ./
COPY --from=builder /temp/prod/node_modules ./node_modules

# COPY backend/functions/package.json backend/functions/package-lock.json ./
# RUN npm ci --production --omit=dev

# COPY backend/functions/build ./
COPY backend/functions/public ./public
# COPY backend/functions/licensed ./licensed

RUN mkdir -p ./licensed
RUN curl -o ./licensed/GeoLite2-City.mmdb https://git.io/GeoLite2-City.mmdb

RUN rm -rf ~/.config/chromium && mkdir -p ~/.config/chromium

ENV LD_PRELOAD=/usr/local/lib/libcurl-impersonate.so CURL_IMPERSONATE=chrome116 CURL_IMPERSONATE_HEADERS=no

# EXPOSE 3000 3001 8080 8081
ENTRYPOINT ["node"]

# FROM base AS crawler

# CMD ["api/crawler.js"]

# FROM base AS searcher

# CMD ["api/searcher.js"]

FROM base AS combined

CMD ["-e", "require('./api/crawler.js'); require('./api/searcher.js')"]