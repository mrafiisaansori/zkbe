// Bungkus handler async agar error otomatis diteruskan ke error handler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
