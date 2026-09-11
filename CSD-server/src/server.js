const { createApp } = require('./app');
const { getPool: getEnginePool } = require('./modules/engine/engine.service');
const { startPaymentSync, stopPaymentSync } = require('./modules/payments/payments.sync');

const app = createApp();
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`ChessSchoolDinamik API запущен на порту ${PORT}`);
});

// Фоновая доподготовка статусов платежей. Запускается здесь, а не в
// createApp(): тесты поднимают приложение через createApp() напрямую, и таймер
// оттуда тикал бы в каждом тестовом файле, стучась в ЮKassa.
startPaymentSync();

// Движок — отдельный дочерний процесс, его нужно гасить явно, иначе после
// остановки сервера он останется висеть в системе.
function shutdown() {
  stopPaymentSync();
  getEnginePool().shutdown();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
