const prisma = require('../../shared/prisma');
const { syncPaymentStatus } = require('./payments.service');

// Вебхук ЮKassa — основной способ узнать об оплате, но он приходит извне и
// может не дойти вовсе: на localhost без туннеля его не существует, в проде
// его съедает упавший сервер или закрытый порт. Тогда реально оплаченный
// платёж навсегда остаётся в pending, а вместе с ним не выдаётся доступ.
//
// Поэтому статусы дополнительно подтягиваются сами: раз в несколько минут
// сервер сам спрашивает ЮKassa про свои незавершённые платежи. Правила
// перехода не дублируются — используется тот же syncPaymentStatus, что и в
// вебхуке.

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;
// Ссылка на оплату у ЮKassa живёт около часа. Брошенные платежи недельной
// давности опрашивать бессмысленно — окно с запасом, но конечное.
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
  // Последовательно, а не Promise.all: пачка запросов к чужому API разом —
  // хороший способ поймать их ограничение частоты, а спешить тут некуда.
  for (const payment of pending) {
    try {
      const result = await syncPaymentStatus(payment.yookassaId);
      if (result.changed) {
        changed += 1;
        console.log(`Платёж ${payment.yookassaId}: статус обновлён на ${result.status}`);
      }
    } catch (err) {
      // Один недоступный платёж не должен останавливать проверку остальных.
      console.warn(`Не удалось проверить платёж ${payment.yookassaId}:`, err.message);
    }
  }
  return { checked: pending.length, changed };
}

function startPaymentSync() {
  // Без ключей ЮKassa каждый тик кончался бы одной и той же ошибкой — молча
  // не запускаемся (типичный дев-стенд без оплаты).
  if (!process.env.YOOKASSA_SHOP_ID || !process.env.YOOKASSA_SECRET_KEY) return null;
  if (timer) return timer;

  const interval = Number(process.env.PAYMENT_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  timer = setInterval(() => {
    // Защита от наложения тиков: медленный ответ ЮKassa не должен запускать
    // второй проход поверх первого.
    if (running) return;
    running = true;
    syncPendingPayments()
      .catch(err => console.warn('Синхронизация платежей не удалась:', err.message))
      .finally(() => { running = false; });
  }, interval);
  // unref — таймер не должен сам по себе удерживать процесс живым.
  timer.unref();
  console.log(`Синхронизация статусов платежей: раз в ${Math.round(interval / 1000)} с`);
  return timer;
}

function stopPaymentSync() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { syncPendingPayments, startPaymentSync, stopPaymentSync };
