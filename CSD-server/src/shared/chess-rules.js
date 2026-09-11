// Общий модуль правил лежит вне server/ — он один и тот же для бэкенда и
// админки, чтобы проверки не разъезжались. chess.js внедряем отсюда, потому
// что node_modules принадлежит серверу.
// При деплое server/ каталог shared/ нужно копировать рядом.
module.exports = require('../../../shared/chess-rules').create(require('chess.js'));
