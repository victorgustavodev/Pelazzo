# Imagem compartilhada pelos serviços de desenvolvimento e migrations.
FROM node:24-bookworm-slim AS development

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --include=dev

COPY . .
RUN npm run db:generate

ENV NODE_ENV=development
EXPOSE 3000 5173
