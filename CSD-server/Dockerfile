# Собирается из КОРНЯ репозитория (docker-compose.yml: context: .), а не из
# CSD-server/ — server/src/shared/chess-rules.js реэкспортирует общий файл из
# ../../../shared/ в корне репо (см. CSD-server/README.md): тот же движок
# правил использует и CSD-app-admin, расходиться им нельзя.
FROM node:20-bookworm-slim

WORKDIR /app

# Stockfish — для кнопки «Рассчитать лучшее решение» (STOCKFISH_PATH, см.
# docker-compose.yml). Без него сервер всё равно поднимется, эндпоинт анализа
# просто будет отвечать понятной ошибкой (см. CSD-server/README.md).
# openssl нужен движку Prisma-клиента, ca-certificates — обращениям к ЮKassa.
RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Устанавливаем зависимости отдельным слоем от исходников — пересборка после
# правки кода не переустанавливает npm-пакеты заново.
COPY CSD-server/package.json CSD-server/package-lock.json ./
RUN npm ci

COPY CSD-server/prisma ./prisma
RUN npx prisma generate

COPY CSD-server/src ./src
COPY CSD-server/scripts ./scripts
COPY CSD-server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Общий модуль правил — копия из корня репозитория (см. комментарий вверху).
# server/src/shared/chess-rules.js резолвит его как ../../../shared/chess-rules
# относительно себя (/app/src/shared/ → /app/src → /app → / → /shared).
COPY shared /shared

# Нарочно НЕ production: CORS в src/app.js в production-режиме пускает только
# один ALLOWED_ORIGIN, а здесь два фронтенда на двух разных портах (CSD-app и
# CSD-app-admin) — обоим нужен доступ. В development-режиме разрешён любой
# origin вида http://localhost:<порт>, что и требуется для докер-компоуза.
ENV NODE_ENV=development
ENV PORT=4000
EXPOSE 4000

# Прогоняет миграции и сидирует админа при каждом старте контейнера (оба шага
# идемпотентны — migrate deploy применяет только новые миграции, seed делает
# upsert), затем передаёт управление CMD.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
