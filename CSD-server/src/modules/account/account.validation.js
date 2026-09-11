const { z } = require('zod');

// Нормализация email живёт здесь, а не в сервисе: middlewares/validate.js
// пишет result.data обратно в req.body, поэтому trim+lowercase случается
// ровно один раз и до любого кода. В БД email всегда в нижнем регистре.
const emailField = z.string().trim().toLowerCase().email('Некорректный email');

// max(72) — bcrypt молча обрезает пароль на 72 байтах; лучше явная ошибка,
// чем пароль, у которого хвост игнорируется при проверке.
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

// Часовой пояс проверяется единственным надёжным способом — попыткой создать
// им форматтер: списка зон в стандартной библиотеке нет, а на неизвестной зоне
// Intl бросает RangeError.
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
