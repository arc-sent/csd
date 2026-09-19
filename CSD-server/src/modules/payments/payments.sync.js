const prisma = require('../../shared/prisma');
const { syncPaymentStatus } = require('./payments.service');

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const BATCH = 50;

let timer = null;
let running = false;

async function syncPendingPayments() {
  const pending = await prisma.payment.findMany({
    where: { status: 'pending', createdAt: { gte: new Date(Date.now() - WINDOW_MS) } },
    orderBy: { createdAt: 'desc' },
    take: BATCH,
    select: { yookassaId: true }
  });

  let changed = 0;
  for (const payment of pending) {
    try {
      const result = await syncPaymentStatus(payment.yookassaId);
      if (result.changed) {
        changed += 1;
        console.log(`Платёж ${payment.yookassaId}: статус обновлён на ${result.status}`);
      }
    } catch (err) {
      console.warn(`Не удалось проверить платёж ${payment.yookassaId}:`, err.message);
    }
  }
  return { checked: pending.length, changed };
}

function startPaymentSync() {
  if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) return null;
  if (timer) return timer;

  const interval = Number(process.env.PAYMENT_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    syncPendingPayments()
      .catch(err => console.warn('Синхронизация платежей не удалась:', err.message))
      .finally(() => { running = false; });
  }, interval);
  timer.unref();
  console.log(`Синхронизация статусов платежей: раз в ${Math.round(interval / 1000)} с`);
  return timer;
}

function stopPaymentSync() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { syncPendingPayments, startPaymentSync, stopPaymentSync };
