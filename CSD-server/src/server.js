const { createApp } = require('./app');
const { getPool: getEnginePool } = require('./modules/engine/engine.service');
const { startPaymentSync, stopPaymentSync } = require('./modules/payments/payments.sync');

const app = createApp();
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`ChessSchoolDinamik API запущен на порту ${PORT}`);
});

startPaymentSync();

function shutdown() {
  stopPaymentSync();
  getEnginePool().shutdown();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
