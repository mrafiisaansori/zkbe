const { Voucher } = require('../models');
const ApiError = require('../utils/ApiError');

// Catatan: voucher kini tersedia untuk SEMUA plan (FREE & PRO). Tetap ter-scope
// merchant — voucher milik merchant lain tidak bisa dipakai.

const todayStr = () => new Date().toISOString().slice(0, 10);

async function list() {
  return Voucher.findAll({ order: [['ID', 'DESC']] });
}

async function getByCode(kode) {
  return Voucher.findOne({ where: { KODE: String(kode || '').trim() } });
}

async function create(data) {
  const kode = String(data.kode || '').trim().toUpperCase();
  const exists = await getByCode(kode);
  if (exists) throw new ApiError(409, 'Kode voucher sudah dipakai');
  return Voucher.create({
    KODE: kode,
    TIPE: data.tipe,
    NILAI: data.nilai,
    MIN_TRANSAKSI: data.min_transaksi || 0,
    VALID_FROM: data.valid_from || null,
    VALID_UNTIL: data.valid_until || null,
    IS_ACTIVE: data.is_active !== undefined ? data.is_active : true,
  });
}

async function update(id, data) {
  const v = await Voucher.findByPk(id);
  if (!v) throw new ApiError(404, 'Voucher tidak ditemukan');
  const map = {
    TIPE: data.tipe,
    NILAI: data.nilai,
    MIN_TRANSAKSI: data.min_transaksi,
    VALID_FROM: data.valid_from,
    VALID_UNTIL: data.valid_until,
    IS_ACTIVE: data.is_active,
  };
  if (data.kode !== undefined) map.KODE = String(data.kode).trim().toUpperCase();
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await v.update(map);
  return v;
}

async function remove(id) {
  const v = await Voucher.findByPk(id);
  if (!v) throw new ApiError(404, 'Voucher tidak ditemukan');
  await v.destroy();
  return true;
}

/**
 * Validasi voucher untuk subtotal tertentu & hitung nominal diskonnya.
 * Mengembalikan { voucher, diskon } atau melempar ApiError bila tidak valid.
 * Dipakai saat checkout dan untuk pratinjau di frontend.
 */
async function validateForSubtotal(kode, subtotal) {
  const v = await getByCode(String(kode || '').trim().toUpperCase());
  if (!v) throw new ApiError(404, 'Kode voucher tidak ditemukan');
  if (!v.IS_ACTIVE) throw new ApiError(400, 'Voucher tidak aktif');

  const today = todayStr();
  if (v.VALID_FROM && today < v.VALID_FROM) throw new ApiError(400, 'Voucher belum berlaku');
  if (v.VALID_UNTIL && today > v.VALID_UNTIL) throw new ApiError(400, 'Voucher sudah kedaluwarsa');
  if (Number(subtotal) < Number(v.MIN_TRANSAKSI || 0)) {
    throw new ApiError(400, `Minimal transaksi voucher Rp${Number(v.MIN_TRANSAKSI).toLocaleString('id-ID')}`);
  }

  let diskon = v.TIPE === 'PERSEN' ? Math.round((Number(subtotal) * Number(v.NILAI)) / 100) : Number(v.NILAI);
  diskon = Math.max(0, Math.min(diskon, Number(subtotal))); // tidak melebihi subtotal
  return { voucher: v, diskon };
}

module.exports = { list, getByCode, create, update, remove, validateForSubtotal };
