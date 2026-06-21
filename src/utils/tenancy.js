const { AsyncLocalStorage } = require('async_hooks');

// Konteks per-request: { merchantId, superadmin, level, userId }.
// Diisi oleh middleware authJwt dan dibaca oleh hook Sequelize.
const storage = new AsyncLocalStorage();

function runWithTenant(ctx, fn) {
  return storage.run(ctx, fn);
}

// Jalankan fn seolah-olah sebagai merchant tertentu (dipakai super admin untuk
// memantau data 1 merchant). Scoping aktif (superadmin: false) agar query
// ter-filter ke merchant target. Read-only — gunakan hanya untuk pemantauan.
function withMerchantScope(merchantId, fn) {
  return storage.run({ merchantId: Number(merchantId), superadmin: false, level: 0 }, fn);
}

function getTenant() {
  return storage.getStore() || {};
}

// Apakah scoping aktif untuk request ini?
// - superadmin: tidak di-scope (boleh lihat semua).
// - tanpa konteks (rute publik: login/register): tidak di-scope.
function activeMerchantId() {
  const { merchantId, superadmin } = getTenant();
  if (superadmin) return undefined;
  if (merchantId === undefined || merchantId === null) return undefined;
  return merchantId;
}

// Suntikkan filter MERCHANT_ID ke options.where (untuk find/count/update/destroy).
function injectWhere(options) {
  const mid = activeMerchantId();
  if (mid === undefined) return;
  options.where = { ...(options.where || {}), MERCHANT_ID: mid };
}

// Set MERCHANT_ID pada instance baru (create) jika belum diisi eksplisit.
function setMerchantOnInstance(instance) {
  const mid = activeMerchantId();
  if (mid === undefined) return;
  if (instance.MERCHANT_ID === undefined || instance.MERCHANT_ID === null) {
    instance.MERCHANT_ID = mid;
  }
}

/**
 * Pasang hook tenant pada sebuah model yang memiliki kolom MERCHANT_ID.
 * Menjamin SEMUA query (find, count, update, destroy) otomatis ter-filter
 * berdasarkan merchant_id dari sesi login — bukan dari input frontend.
 */
function scopeModel(model) {
  model.addHook('beforeFind', injectWhere);
  model.addHook('beforeCount', injectWhere);
  model.addHook('beforeBulkUpdate', injectWhere);
  model.addHook('beforeBulkDestroy', injectWhere);
  model.addHook('beforeCreate', setMerchantOnInstance);
  model.addHook('beforeBulkCreate', (instances) => {
    (instances || []).forEach(setMerchantOnInstance);
  });
}

module.exports = { runWithTenant, withMerchantScope, getTenant, activeMerchantId, scopeModel };
