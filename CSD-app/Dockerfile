# Самодостаточная сборка — контекст docker-compose.yml для этого сервиса
# указывает прямо на CSD-app/, без shared/ (react-версии сайта он не нужен,
# см. mackets/macket-admin/ADMIN-README.md и предыдущий разбор в чате).
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Инлайнится в бандл на этапе сборки (Vite), поэтому должен быть известен уже
# здесь — значение по умолчанию совпадает с тем, что и так зашито в
# src/lib/api.js на случай, если переменная вообще не задана.
ARG VITE_API_BASE_URL=http://localhost:4000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Абсолютный адрес сайта для canonical/og:url/sitemap (см. index.html и
# vite.config.js) — тоже инлайнится при сборке.
ARG VITE_SITE_URL=https://app.31-76-46-113.sslip.io
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# Готовая статика — просто раздаём через nginx. Клиентского роутинга по путям
# нет (маршрут живёт в query-параметре ?view=, см. src/lib/route.js), поэтому
# особый SPA-fallback (try_files) не нужен — годится дефолтный конфиг nginx.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
