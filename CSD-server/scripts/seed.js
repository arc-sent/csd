require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/shared/prisma');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Задайте ADMIN_EMAIL и ADMIN_PASSWORD в .env перед сидированием');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });
  console.log('Админ создан/обновлён:', admin.email);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
