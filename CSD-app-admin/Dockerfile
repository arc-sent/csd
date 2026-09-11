# Собирается из КОРНЯ репозитория (docker-compose.yml: context: .), а не из
# CSD-app-admin/ — vite.config.js резолвит общий движок правил как
# ../shared/chess-rules.js относительно себя (см. комментарий в самом
# vite.config.js) и вшивает его в сборку как отдельный chess-rules.js.
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY CSD-app-admin/package.json CSD-app-admin/package-lock.json ./
RUN npm ci

COPY CSD-app-admin/ ./
# ../shared/chess-rules.js относительно /app (см. заголовок файла) — значит
# /shared, ровно то, что кладём здесь.
COPY shared /shared

ARG VITE_API_BASE_URL=http://localhost:4000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Клиентского роутинга по путям нет (переключение экранов — внутреннее
# состояние React, не URL), поэтому годится дефолтный конфиг nginx без
# SPA-fallback.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
