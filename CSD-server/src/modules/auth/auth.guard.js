const { makeGuard } = require('../../shared/guard');

const authGuard = makeGuard('admin', 'admin');

module.exports = { authGuard };
