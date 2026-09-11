const { makeGuard } = require('../../shared/guard');

// ≈ Nest Guard: пропускает дальше только с валидным Bearer-токеном АДМИНА.
// Проверка claim'а type обязательна: секрет общий с токенами покупателей
// (модуль account), и без неё пользовательский токен открыл бы весь админский
// CRUD. req.admin сохраняется — контроллеры читают req.admin.sub.
const authGuard = makeGuard('admin', 'admin');

module.exports = { authGuard };
