const { z } = require('zod');

const emailField = z.string().trim().toLowerCase().email('Некорректный email');

const requestResetSchema = z.object({
  email: emailField
});

const verifyResetSchema = z.object({
  email: emailField,
  code: z.string().regex(/^\d{6}$/, 'Код должен состоять из 6 цифр')
});

// max(72) — bcrypt молча обрезает пароль на 72 байтах, тот же приём, что и
// в account.validation.js.
const confirmResetSchema = z.object({
  resetToken: z.string().min(1, 'Отсутствует токен восстановления'),
  newPassword: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(72, 'Пароль слишком длинный')
});

module.exports = { requestResetSchema, verifyResetSchema, confirmResetSchema };
