const ApiError = require('../utils/ApiError');

// 404 handler
function notFound(req, res, next) {
  next(new ApiError(404, `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`));
}

// Global error handler -> selalu mengembalikan JSON standar.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 422;
    details = err.errors ? err.errors.map((e) => e.message) : null;
    message = 'Validasi database gagal';
  } else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 400;
    message = 'Query database error';
  }

  if (statusCode === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message, details });
}

module.exports = { notFound, errorHandler };
