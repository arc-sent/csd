const { makeGuard } = require('../../shared/guard');

// Пропускает только токен ПОКУПАТЕЛЯ (type: 'user'). Админский токен сюда не
// проходит — это не формальность: у обоих один секрет, и без проверки типа
// границы между админкой и кабинетом просто не было бы.
// req.user.sub — id из таблицы users.
const userGuard = makeGuard('user', 'user');

module.exports = { userGuard };
