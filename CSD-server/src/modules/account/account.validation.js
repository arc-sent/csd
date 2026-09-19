const { z } = require('zod');

const emailField = z.string().trim().toLowerCase().email('Некорректный email');

const registerSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(72, 'Пароль слишком длинный'),
  name: z.string().trim().max(80, 'Имя слишком длинное').optional()
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Введите пароль')
});

const progressSchema = z.object({
  event: z.enum(['solved', 'mistake']),
  usedSolution: z.boolean().optional()
});

const timeZoneSchema = z.object({
  timeZone: z.string().refine(
    value => {
      try {
        new Intl.DateTimeFormat('en-CA', { timeZone: value });
        return true;
      } catch (err) {
        return false;
      }
    },
    { message: 'Неизвестный часовой пояс' }
  )
});

module.exports = { registerSchema, loginSchema, progressSchema, timeZoneSchema };
