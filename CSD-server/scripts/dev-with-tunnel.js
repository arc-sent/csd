require('dotenv').config();
const path = require('path');
const nodemon = require('nodemon');
const ngrok = require('@ngrok/ngrok');

const PORT = process.env.PORT || 4000;
const SERVER_ENTRY = path.join(__dirname, '..', 'src', 'server.js');

function fail(message) {
  console.error('\n✕ ' + message + '\n');
  process.exit(1);
}

async function main() {
  if (!process.env.NGROK_AUTHTOKEN) {
    fail(
      'NGROK_AUTHTOKEN не задан в .env.\n' +
        '  1. Бесплатный аккаунт: https://dashboard.ngrok.com/signup\n' +
        '  2. Токен: https://dashboard.ngrok.com/get-started/your-authtoken\n' +
        '  3. Впишите его в CSD-server/.env как NGROK_AUTHTOKEN'
    );
  }

  let listener;
  try {
    listener = await ngrok.connect({
      addr: PORT,
      authtoken: process.env.NGROK_AUTHTOKEN,
      domain: process.env.NGROK_DOMAIN || undefined
    });
  } catch (err) {
    fail('Не удалось поднять туннель ngrok: ' + err.message);
    return;
  }

  const publicUrl = listener.url();
  const webhookUrl = `${publicUrl}/api/payments/webhook`;
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('  Туннель поднят:', publicUrl);
  console.log('  Адрес вебхука для ЮKassa:');
  console.log('   ', webhookUrl);
  if (!process.env.NGROK_DOMAIN) {
    console.log('\n  Адрес случайный и сменится при следующем запуске —');
    console.log('  задайте NGROK_DOMAIN в .env (бесплатный статический домен');
    console.log('  на dashboard.ngrok.com/domains), чтобы он был постоянным.');
  }
  console.log('\n  Впишите его в личном кабинете ЮKassa:');
  console.log('  Настройки магазина → HTTP-уведомления → payment.succeeded');
  console.log('─────────────────────────────────────────────────────────\n');

  nodemon({ script: SERVER_ENTRY });

  nodemon.on('crash', () => {
    console.error('Сервер упал (crash) — nodemon ждёт правок, чтобы перезапустить.');
  });

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\nОстанавливаю туннель…');
    await ngrok.disconnect().catch(() => {});
    await ngrok.kill().catch(() => {});
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  nodemon.on('quit', shutdown);
}

main();
