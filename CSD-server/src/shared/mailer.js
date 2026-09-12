// Тонкая обёртка над nodemailer — обычный SMTP (Яндекс/Mail.ru/корпоративная
// почта и т.п.), а не привязка к конкретному API-сервису вроде SendGrid,
// тем же приёмом, что и реквизиты ЮKassa в .env.
//
// Без настроенного SMTP код печатается в консоль сервера, а не роняет вызов —
// тот же приём, что у payments.sync.js: фича молча не активна без нужных
// переменных окружения, вместо того чтобы ронять основной поток (здесь —
// регистрацию). Это важно для локальной разработки и тестов без реального
// почтового ящика.
const nodemailer = require('nodemailer');

let transporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

// Транспорт создаётся один раз и лениво — не при загрузке модуля (в тестах
// переменные окружения могут появиться уже после require), а при первой
// реальной отправке.
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text }) {
  if (!isConfigured()) {
    // Дев-режим: письмо не уходит, но код виден в логе — им можно
    // пользоваться без настоящего почтового ящика.
    console.log(`[dev] Письмо для ${to} (SMTP не настроен):\n${text}`);
    return { delivered: false };
  }

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'ChessSchoolDinamik <no-reply@chesslab.local>',
      to,
      subject,
      text
    });
    return { delivered: true };
  } catch (err) {
    // Ошибка самой отправки (SMTP сконфигурирован, но упал — неверные
    // реквизиты, недоступен провайдер и т.п.) не должна ронять вызывающий
    // код: аккаунт уже создан, пользователь может запросить код ещё раз.
    console.warn(`Не удалось отправить письмо на ${to}:`, err.message);
    return { delivered: false, error: err.message };
  }
}

module.exports = { sendMail };
