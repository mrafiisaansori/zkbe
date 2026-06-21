// Format response JSON standar untuk seluruh API.
function success(res, { data = null, message = 'OK', statusCode = 200, meta = undefined } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data, message = 'Data berhasil dibuat') {
  return success(res, { data, message, statusCode: 201 });
}

function fail(res, statusCode, message, details = null) {
  return res.status(statusCode).json({ success: false, message, details });
}

module.exports = { success, created, fail };
