// Satu definisi stok menipis untuk dashboard dan laporan agar hasil selalu sinkron.
const LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_LIMIT = 10;
const LOW_STOCK_ORDER = [['STOK', 'ASC'], ['ID', 'ASC']];

module.exports = { LOW_STOCK_THRESHOLD, LOW_STOCK_LIMIT, LOW_STOCK_ORDER };
