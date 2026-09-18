const crypto = require('crypto');
const prisma = require('../../shared/prisma');
const { AppError } = require('../../shared/errors');
const entitlements = require('../account/entitlements.service');

// ЮKassa ждёт сумму строкой с ровно двумя знаками после запятой ("1200.00"),
// а не числом — Assignment.price хранится как Float в рублях.
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

// Покупка задания и покупка этапа целиком — один и тот же сценарий с разным
// источником цены/описания/проверки владения, поэтому общая часть (создание
// платежа в ЮKassa и записи Payment) вынесена сюда. target — либо
// {kind: 'assignment', row}, либо {kind: 'stage', row}.
async function createPaymentForTarget(target, userId) {
  const { row, kind } = target;
  if (!row.price || row.price <= 0) {
    throw new AppError(
      400,
      kind === 'stage' ? 'У этапа не указана цена — покупка целиком выключена.' : 'У задания не указана цена — оплата не требуется.'
    );
  }

  // Покупка только из-под аккаунта: платёж сразу привязывается к userId, из
  // него же берётся почта для чека — клиент email больше не присылает, иначе
  // можно было бы отправить чужой чек.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(401, 'Требуется авторизация');
  const email = user.email;

  const alreadyOwned =
    kind === 'stage' ? await entitlements.ownsStage(userId, row.id) : await entitlements.ownsAssignment(userId, row.id);
  if (alreadyOwned) {
    throw new AppError(409, kind === 'stage' ? 'Этап уже куплен' : 'Задание уже куплено');
  }

  const { shopId, secretKey, apiUrl, returnUrl } = getYookassaConfig();

  // У магазина подключена онлайн-касса (54-ФЗ) — ЮKassa требует чек с каждым
  // платежом, а чеку нужен контакт покупателя (email или телефон), иначе его
  // некуда/некому отправить. Защита от аккаунта без почты — теоретическая,
  // email на User обязателен.
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
      // vat_code:1 — «без НДС» (обычный дефолт для ИП на УСН/самозанятых);
      // поправить на нужный код, если налоговый режим другой.
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

  // Заводим запись о платеже сразу после создания на стороне ЮKassa —
  // вебхук потом найдёт её по yookassaId и обновит статус на актуальный.
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

// Актуальный статус платежа из первых рук: авторизованный запрос нашими же
// ключами. Единственный источник правды о статусе — телу входящего вебхука
// доверять нельзя, его может прислать кто угодно, зная URL.
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

// Доступ к заданию выводится из статуса платежа (см. account/entitlements),
// поэтому смена статуса на succeeded — это и есть выдача доступа. Источников
// повода перепроверить статус три: вебхук ЮKassa, фоновый синхронизатор
// (payments.sync.js) и кнопка «Обновить» в админке — правила перехода у всех
// обязаны быть одни и те же, поэтому живут здесь в единственном экземпляре.
//
// Уведомления ЮKassa ретраятся и могут прийти не по порядку, так что запись
// обязана быть однократной и не откатываться «старым» статусом.
async function syncPaymentStatus(paymentId) {
  const fresh = await fetchPaymentStatus(paymentId);
  const existing = await prisma.payment.findUnique({ where: { yookassaId: paymentId } });

  // Платёж не наш (или создан в другой среде).
  if (!existing) {
    return { status: fresh.status, matched: false, changed: false };
  }
  if (existing.status === fresh.status) {
    return { status: fresh.status, matched: true, changed: false };
  }
  // Успех уже зафиксирован, а пришёл более ранний статус — доступ не отбираем.
  if (existing.status === 'succeeded' && fresh.status !== 'succeeded') {
    return { status: existing.status, matched: true, changed: false };
  }

  // Оптимистичная блокировка по прежнему статусу: из двух параллельных
  // ретраев запись сделает ровно один.
  const updated = await prisma.payment.updateMany({
    where: { yookassaId: paymentId, status: existing.status },
    data: { status: fresh.status }
  });

  return { status: fresh.status, matched: true, changed: updated.count === 1 };
}

// ЮKassa шлёт вебхук с телом вида {event, object: {id, status, ...}}, но это
// тело может подделать кто угодно, зная URL — доверять ему напрямую нельзя,
// берётся только id платежа, а статус перепрашивается у ЮKassa.
async function handleWebhook(payload) {
  const paymentId = payload && payload.object && payload.object.id;
  if (!paymentId) {
    throw new AppError(400, 'В уведомлении вебхука нет id платежа');
  }

  const result = await syncPaymentStatus(paymentId);
  // Неизвестный платёж — всё равно 200 из контроллера, иначе ЮKassa будет
  // ретраить вечно то, что мы всё равно не сможем обработать.
  if (!result.matched) console.warn('Вебхук по неизвестному платежу', paymentId);
  return result;
}


// ---------- Админка ----------

// Журнал платежей. Постраничности в проекте нет нигде, и заводить её ради
// одного экрана незачем — фильтры плюс потолок закрывают задачу.
const LIST_LIMIT = 200;

// Один и тот же набор полей для списка и для точечного обновления: интерфейсу
// остаётся подменить карточку тем, что вернулось.
const PAYMENT_CARD = {
  id: true,
  yookassaId: true,
  email: true,
  amount: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  // Задание, этап и аккаунт отвязываются через SetNull — все могут быть null
  // у старого платежа, интерфейс показывает это как «удалено».
  assignment: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true } },
  user: { select: { id: true, email: true } }
};

async function listPayments({ q, status, assignmentId } = {}) {
  const where = {};
  if (status) where.status = status;
  if (assignmentId) where.assignmentId = assignmentId;
  // Поиск по почте платежа — она у платежа своя (адрес чека на момент
  // продажи), поэтому по аккаунту искать не нужно.
  if (q) where.email = { contains: q, mode: 'insensitive' };

  return prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: PAYMENT_CARD
  });
}

// Точечное «Обновить статус» из админки: когда ждать следующего тика фонового
// синхронизатора не хочется.
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
