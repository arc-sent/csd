#!/bin/sh
# Запускается при каждом старте контейнера, до CMD (node src/server.js).
# Оба шага идемпотентны, поэтому безопасно гонять их на каждом рестарте:
#   - migrate deploy применяет только ещё не применённые миграции;
#   - seed делает upsert админа (см. scripts/seed.js), а не create.
set -e

echo "[entrypoint] Применяю миграции Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Создаю/обновляю администратора (ADMIN_EMAIL)..."
npm run seed

echo "[entrypoint] Готово, запускаю сервер."
exec "$@"
