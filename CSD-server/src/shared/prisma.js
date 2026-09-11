const { PrismaClient } = require('@prisma/client');

// Один инстанс на процесс (и переиспользуется между hot-reload в dev),
// чтобы не плодить лишние подключения к Postgres.
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
