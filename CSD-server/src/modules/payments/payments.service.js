const crypto = require('crypto');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const entitlements = require('../account/entitlements.service');

function formatAmount(price) {
  return price.toFixed(2);
}

function getYookassaConfig() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) {
    throw new AppError(500, 'ЮKassa не настроена: заполните YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env');
  }
  return {
    shopId,
    secretKey,
    apiUrl: process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3',
    returnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:8137/index.html'
  };
}

function authHeader(shopId, secretKey) {
  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
}

async function createPaymentForTarget(target, userId) {
  const { row, kind } = target;
  if (!row.price || row.price <= 0) {
    throw new AppError(
      400,
      kind === 'stage' ? 'У этапа не указана цена — покупка целиком выключена.' : 'У задания не указана цена — оплата не требуется.'
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(401, 'Требуется авторизация');
  const email = user.email;

  const alreadyOwned =
    kind === 'stage' ? await entitlements.ownsStage(userId, row.id) : await entitlements.ownsAssignment(userId, row.id);
  if (alreadyOwned) {
    throw new AppError(409, kind === 'stage' ? 'Этап уже куплен' : 'Задание уже куплено');
  }

  const { shopId, secretKey, apiUrl, returnUrl } = getYookassaConfig();

  if (!email) {
    throw new AppError(400, 'Для формирования чека нужен email покупателя.');
  }

  const amount = formatAmount(row.price);
  const label = kind === 'stage' ? `этапа «${row.name}»` : `задания «${row.name}»`;
  const description = `Оплата ${label}`;

  const res = await fetch(`${apiUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(shopId, secretKey),
      'Idempotence-Key': crypto.randomUUID()
    },
    body: JSON.stringify({
      amount: { value: amount, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: returnUrl },
      description,
      metadata: { [kind === 'stage' ? 'stageId' : 'assignmentId']: row.id, userId, email },
      receipt: {
        customer: { email },
        items: [{
          description: description.slice(0, 128),
          quantity: '1.00',
          amount: { value: amount, currency: 'RUB' },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'service'
        }]
      }
    })
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AppError(502, 'Ошибка ЮKassa', body);
  }

  await prisma.payment.create({
    data: {
      yookassaId: body.id,
      assignmentId: kind === 'assignment' ? row.id : null,
      stageId: kind === 'stage' ? row.id : null,
      userId,
      email,
      amount: row.price,
      status: body.status || 'pending'
    }
  });

  return {
    id: body.id,
    status: body.status,
    confirmationUrl: body.confirmation && body.confirmation.confirmation_url
  };
}

async function createPayment({ assignmentId, stageId, userId }) {
  if (stageId) {
    const stage = await prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new AppError(404, 'Этап не найден');
    return createPaymentForTarget({ kind: 'stage', row: stage }, userId);
  }
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new AppError(404, 'Задание не найдено');
  return createPaymentForTarget({ kind: 'assignment', row: assignment }, userId);
}

async function fetchPaymentStatus(paymentId) {
  const { shopId, secretKey, apiUrl } = getYookassaConfig();
  const res = await fetch(`${apiUrl}/payments/${paymentId}`, {
    headers: { 'Authorization': authHeader(shopId, secretKey) }
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new AppError(502, 'Не удалось проверить статус платежа в ЮKassa', body);
  }
  return body;
}

async function syncPaymentStatus(paymentId) {
  const fresh = await fetchPaymentStatus(paymentId);
  const existing = await prisma.payment.findUnique({ where: { yookassaId: paymentId } });

  if (!existing) {
    return { status: fresh.status, matched: false, changed: false };
  }
  if (existing.status === fresh.status) {
    return { status: fresh.status, matched: true, changed: false };
  }
  if (existing.status === 'succeeded' && fresh.status !== 'succeeded') {
    return { status: existing.status, matched: true, changed: false };
  }

  const updated = await prisma.payment.updateMany({
    where: { yookassaId: paymentId, status: existing.status },
    data: { status: fresh.status }
  });

  return { status: fresh.status, matched: true, changed: updated.count === 1 };
}

async function handleWebhook(payload) {
  const paymentId = payload && payload.object && payload.object.id;
  if (!paymentId) {
    throw new AppError(400, 'В уведомлении вебхука нет id платежа');
  }

  const result = await syncPaymentStatus(paymentId);
  if (!result.matched) console.warn('Вебхук по неизвестному платежу', paymentId);
  return result;
}


const LIST_LIMIT = 200;

const PAYMENT_CARD = {
  id: true,
  yookassaId: true,
  email: true,
  amount: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  assignment: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true } },
  user: { select: { id: true, email: true } }
};

async function listPayments({ q, status, assignmentId } = {}) {
  const where = {};
  if (status) where.status = status;
  if (assignmentId) where.assignmentId = assignmentId;
  if (q) where.email = { contains: q, mode: 'insensitive' };

  return prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: PAYMENT_CARD
  });
}

async function refreshPayment(id) {
  const payment = await prisma.payment.findUnique({ where: { id }, select: { yookassaId: true } });
  if (!payment) throw new AppError(404, 'Платёж не найден');
  await syncPaymentStatus(payment.yookassaId);
  return prisma.payment.findUnique({ where: { id }, select: PAYMENT_CARD });
}

module.exports = {
  createPayment,
  handleWebhook,
  syncPaymentStatus,
  fetchPaymentStatus,
  listPayments,
  refreshPayment
};
