const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parsePagination(query = {}, defaults = {}) {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  if (!hasPagination && defaults.optional !== false) return null;

  const maxLimit = defaults.maxLimit || MAX_LIMIT;
  const defaultLimit = defaults.defaultLimit || DEFAULT_LIMIT;
  const page = Math.max(1, toPositiveInt(query.page, 1));
  const limit = Math.min(maxLimit, Math.max(1, toPositiveInt(query.limit, defaultLimit)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginationMeta({ page, limit }, total) {
  const safeTotal = Number(total) || 0;
  return {
    page,
    limit,
    total: safeTotal,
    total_pages: Math.max(1, Math.ceil(safeTotal / limit)),
  };
}

function paginated(rows, total, pagination) {
  return {
    rows,
    meta: paginationMeta(pagination, total),
  };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  paginationMeta,
  paginated,
};
