const nodemailer = require('nodemailer');

let transporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

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

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.log(`[dev] Письмо для ${to} (SMTP не настроен):\n${text}`);
    return { delivered: false };
  }

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'ChessSchoolDinamik <no-reply@chesslab.local>',
      to,
      subject,
      text,
      html
    });
    return { delivered: true };
  } catch (err) {
    console.warn(`Не удалось отправить письмо на ${to}:`, err.message);
    return { delivered: false, error: err.message };
  }
}

module.exports = { sendMail };
