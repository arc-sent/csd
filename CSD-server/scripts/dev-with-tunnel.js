// npm run dev:money — поднимает сервер (как обычный `npm run dev`) и туннель
// ngrok в порт сервера одновременно, печатает готовый адрес вебхука ЮKassa.
//
// Зачем это вообще нужно: ЮKassa подтверждает оплату вебхуком —
// POST-запросом СО СВОЕЙ стороны на наш сервер (см. payments.service.js
// handleWebhook). localhost:4000 недоступен из интернета, поэтому без
// туннеля вебхук никогда не доходит, платежи навсегда остаются в статусе
// "pending", и доступ к заданию не выдаётся, даже если деньги реально
// списаны — это уже случалось на реальных платежах.
//
// Пакет — официальный @ngrok/ngrok (актуальный агент v3), НЕ старый
// пакет "ngrok" с npm: тот тащит заброшенный с 2021 года агент v2, который
// новые аккаунты ngrok больше не пускают (ERR_NGROK_121).
//
// Сервер запускается через программный API nodemon (require('nodemon')),
// а не спавном дочернего процесса nodemon.cmd через shell: путь проекта
// содержит скобки и пробел (chess-landing(1)), и на Windows cmd.exe рвёт
// такой путь на границе пробела, если его не обернуть в кавычки вручную.
// Программный API этой проблемы не имеет вообще — он ничего не спавнит.
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
      // Без домена ngrok каждый раз выдаёт новый случайный адрес — тогда
      // ссылку на вебхук в кабинете ЮKassa придётся перевписывать заново.
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

  // Обычный `npm run dev` (nodemon) — как есть, со всеми перезапусками при
  // правках кода. Туннель поднят независимо и переживает эти перезапуски.
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

  // nodemon сам ловит Ctrl+C, аккуратно гасит свой дочерний процесс (в т.ч.
  // движок Stockfish внутри него — см. shutdown() в src/server.js) и потом
  // эмитит 'quit'. Досюда мы просто ждём и добавляем к этому остановку
  // туннеля. Отдельный SIGINT-хендлер — на случай, если Ctrl+C прилетит ещё
  // до старта nodemon (например, пока висит ngrok.connect()).
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  nodemon.on('quit', shutdown);
}

main();
