const ApiError = require('../utils/ApiError');

// Middleware validasi request berbasis Joi schema { body, query, params }.
module.exports = (schema) => (req, res, next) => {
  const parts = ['body', 'query', 'params'];
  for (const part of parts) {
    if (!schema[part]) continue;
    const { error, value } = schema[part].validate(req[part], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new ApiError(422, 'Validasi gagal', details));
    }
    req[part] = value;
  }
  next();
};
