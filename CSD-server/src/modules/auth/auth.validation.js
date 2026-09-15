const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен')
});

// max(72) — bcrypt молча обрезает пароль на 72 байтах, тот же приём, что и
// в account.validation.js/password-reset.validation.js.
const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(72, 'Пароль слишком длинный')
});

const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Некорректный email')
});

const verifyEmailChangeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Код должен состоять из 6 цифр')
});

const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email')
});

const verifyPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email('Некорректный email'),
  code: z.string().regex(/^\d{6}$/, 'Код должен состоять из 6 цифр')
});

const confirmPasswordResetSchema = z.object({
  resetToken: z.string().min(1, 'Отсутствует токен восстановления'),
  newPassword: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(72, 'Пароль слишком длинный')
});

module.exports = {
  loginSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
  requestPasswordResetSchema,
  verifyPasswordResetSchema,
  confirmPasswordResetSchema
};
