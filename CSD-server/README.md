# ChessSchoolDinamik API

Бэкенд админ-панели: Express + Prisma + PostgreSQL + Stockfish.

## Запуск с нуля

```bash
cd CSD-server
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

В `.env` пропишите `DATABASE_URL` своего PostgreSQL. `npm run seed` создаёт
админа из `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Подключение Stockfish

Кнопка «Рассчитать лучшее решение» требует нативный бинарник Stockfish.
Без него вся остальная админка работает как обычно — эндпоинт анализа просто
вернёт понятную ошибку.

Установка:

```bash
winget install --id Stockfish.Stockfish
```

Либо скачайте сборку с [stockfishchess.org/download](https://stockfishchess.org/download/)
и распакуйте куда удобно. Затем укажите путь в `.env`:

```
STOCKFISH_PATH="C:\\Program Files\\Stockfish\\stockfish.exe"
```

Ограничения расчёта задаются там же (`STOCKFISH_MAX_DEPTH`,
`STOCKFISH_MAX_MOVETIME`) — их выставляет сервер, а не клиент, чтобы запросом
с огромной глубиной нельзя было занять движок надолго.

Проверить, что движок подхватился:

```bash
curl -s -X POST http://localhost:4000/api/engine/analyze \
  -H "Authorization: Bearer <ТОКЕН>" -H "Content-Type: application/json" \
  -d '{"position":[["","","","","♚","","",""],["","","","","","","",""],["","","","","","","",""],["","","","","","","",""],["","","","","","","",""],["","","","","","","",""],["","","","","","","",""],["","","","♕","♔","","",""]],"turn":"w","castling":{"wOO":false,"wOOO":false,"bOO":false,"bOOO":false},"depth":12}'
```

## Тесты

Нужна поднятая БД с накаченной схемой. Настоящий Stockfish для тестов НЕ нужен:
движок подменяется фейковым UCI-процессом (`tests/fixtures/fake-uci-engine.js`),
что делает тесты быстрыми и детерминированными.

```bash
npm test
```

## Структура

```
src/
├── modules/
│   ├── auth/     — вход, JWT, guard
│   ├── levels/   — CRUD уровней, публикация
│   └── engine/   — Stockfish: пул процесса, очередь, анализ
├── shared/       — prisma, ошибки, шахматные правила
└── middlewares/  — обработчик ошибок, валидация (zod)
```

`src/shared/chess-rules.js` — реэкспорт общего модуля из `../shared/` в корне
репозитория: один и тот же код правил используют и сервер, и админка.
**При деплое каталог `shared/` нужно копировать рядом с `CSD-server/`.**
