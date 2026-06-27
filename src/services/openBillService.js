const { Op } = require('sequelize');
const {
  sequelize, OpenBill, OpenBillDetail, Produk, Pengguna, Merchant,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId } = require('../utils/tenancy');
const { currentPlan, hasProFeatures } = require('../utils/plan');
const penjualanService = require('./penjualanService');
const modifierService = require('./modifierService');

// Open Bill hanya untuk plan PRO/BUSINESS. Divalidasi di backend (bukan sekadar UI).
async function assertPro() {
  const plan = await currentPlan();
  if (!hasProFeatures(plan)) {
    throw new ApiError(403, 'Fitur Open Bill hanya tersedia di plan PRO. Upgrade ke PRO untuk menggunakannya.');
  }
}

/**
 * STRATEGI STOK (penting):
 * Stok TIDAK dikurangi saat bill berstatus OPEN. Stok hanya dikurangi saat bill
 * DIBAYAR (PAID) — memakai alur checkout penjualan yang sudah ada.
 *
 * Alasan dipilih (paling aman & sederhana):
 *  - Open bill bersifat draft yang sering diedit (tambah/kurang/hapus item).
 *    Bila stok dikurangi saat OPEN, tiap edit harus menghitung selisih stok dan
 *    cancel harus mengembalikan stok — rawan bug & state stok "setengah jalan".
 *  - Dengan mengurangi stok hanya saat PAID: edit & cancel tidak menyentuh stok,
 *    pembatalan tidak butuh pengembalian stok, dan konsisten dengan checkout
 *    langsung yang juga mengurangi stok saat pembayaran.
 *  - Validasi stok tetap dilakukan saat pembayaran (mencegah oversell).
 */

const STATUS = { OPEN: 'OPEN', PAID: 'PAID', CANCELLED: 'CANCELLED' };

const includeFull = [
  { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
  { model: OpenBillDetail, as: 'detail', include: [{ model: Produk, as: 'produk', attributes: ['ID', 'NAMA', 'STOK'] }] },
];

// Nomor bill unik per merchant: BILL-{PREFIX}-{YYYYMMDD}-{RUNNING}
async function buildNoBill(id) {
  const mid = activeMerchantId();
  const merchant = mid ? await Merchant.findByPk(mid) : null;
  const code = (merchant && merchant.INVOICE_PREFIX) ? merchant.INVOICE_PREFIX : 'TK';
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `BILL-${code}-${ymd}-${String(id).padStart(4, '0')}`;
}

// Validasi item & hitung subtotal dari harga produk saat ini (snapshot).
async function resolveItems(items, t) {
  if (!items || items.length === 0) throw new ApiError(400, 'Item bill tidak boleh kosong');
  let total = 0;
  const resolved = [];
  for (const it of items) {
    const produk = await Produk.findByPk(it.id_produk, { transaction: t });
    if (!produk) throw new ApiError(404, `Produk ID ${it.id_produk} tidak ditemukan`);
    const qty = Number(it.qty);
    if (!(qty > 0)) throw new ApiError(400, `QTY tidak valid untuk produk ${produk.NAMA}`);
    // Modifier/varian -> tambahan harga + deskripsi.
    const mod = await modifierService.resolveModifiers(it.modifier_option_ids);
    const unit = produk.HARGA_JUAL + mod.extra;
    total += unit * qty;
    const modIds = (it.modifier_option_ids || []).join(',') || null;
    resolved.push({ produk, qty, unit, modText: mod.text, modIds, note: it.note || null });
  }
  return { total, resolved };
}

async function getById(id) {
  // findByPk ter-scope merchant otomatis (hook) -> bill merchant lain => 404.
  const bill = await OpenBill.findByPk(id, { include: includeFull });
  if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
  return bill;
}

async function list({ status, search } = {}) {
  const where = {};
  if (status) where.STATUS = status;
  if (search) {
    where[Op.or] = [
      { CUSTOMER_NAME: { [Op.like]: `%${search}%` } },
      { TABLE_NO: { [Op.like]: `%${search}%` } },
      { NO_BILL: { [Op.like]: `%${search}%` } },
    ];
  }
  return OpenBill.findAll({
    where,
    include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
    order: [['ID', 'DESC']],
  });
}

/**
 * Buat open bill baru (status OPEN). Stok TIDAK disentuh.
 */
async function create({ customer_name, table_no, note, items, id_user }) {
  await assertPro();
  return sequelize.transaction(async (t) => {
    const { total, resolved } = await resolveItems(items, t);

    const bill = await OpenBill.create({
      NO_BILL: null,
      CUSTOMER_NAME: customer_name || null,
      TABLE_NO: table_no || null,
      NOTE: note || null,
      STATUS: STATUS.OPEN,
      TOTAL: total,
      ID_USER: id_user,
    }, { transaction: t });

    const noBill = await buildNoBill(bill.ID);
    await bill.update({ NO_BILL: noBill }, { transaction: t });

    for (const r of resolved) {
      await OpenBillDetail.create({
        ID_OPEN_BILL: bill.ID,
        ID_PRODUK: r.produk.ID,
        HARGA_BELI: r.produk.HARGA_BELI,
        HARGA_JUAL: r.unit,
        QTY: r.qty,
        MODIFIER: r.modText,
        MODIFIER_OPTIONS: r.modIds,
        NOTE: r.note,
      }, { transaction: t });
    }
    return bill.ID;
  }).then((id) => getById(id));
}

/**
 * Update open bill (hanya bila masih OPEN): ganti seluruh item + info bill.
 * Item lama dihapus lalu ditulis ulang dari payload. Stok TIDAK disentuh.
 */
async function update(id, { customer_name, table_no, note, items }) {
  await assertPro();
  await sequelize.transaction(async (t) => {
    const bill = await OpenBill.findByPk(id, { transaction: t });
    if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
    if (bill.STATUS !== STATUS.OPEN) throw new ApiError(400, `Bill berstatus ${bill.STATUS} tidak dapat diubah`);

    const patch = {};
    if (customer_name !== undefined) patch.CUSTOMER_NAME = customer_name || null;
    if (table_no !== undefined) patch.TABLE_NO = table_no || null;
    if (note !== undefined) patch.NOTE = note || null;

    if (items !== undefined) {
      const { total, resolved } = await resolveItems(items, t);
      await OpenBillDetail.destroy({ where: { ID_OPEN_BILL: id }, transaction: t });
      for (const r of resolved) {
        await OpenBillDetail.create({
          ID_OPEN_BILL: id,
          ID_PRODUK: r.produk.ID,
          HARGA_BELI: r.produk.HARGA_BELI,
          HARGA_JUAL: r.unit,
          QTY: r.qty,
          MODIFIER: r.modText,
          MODIFIER_OPTIONS: r.modIds,
          NOTE: r.note,
        }, { transaction: t });
      }
      patch.TOTAL = total;
    }
    await bill.update(patch, { transaction: t });
  });
  return getById(id);
}

/**
 * Bayar open bill (OPEN -> PAID). Memakai alur checkout penjualan yang sudah ada
 * sehingga transaksi masuk ke riwayat & dashboard (omzet). Stok dikurangi DI SINI.
 */
async function pay(id, { id_jenis_bayar, bayar, keterangan, diskon = 0 }) {
  const bill = await OpenBill.findByPk(id, { include: [{ model: OpenBillDetail, as: 'detail' }] });
  if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
  if (bill.STATUS !== STATUS.OPEN) throw new ApiError(400, `Bill berstatus ${bill.STATUS} tidak dapat dibayar`);
  if (!bill.detail || bill.detail.length === 0) throw new ApiError(400, 'Bill tidak memiliki item');

  // checkout() memvalidasi stok, membuat t_penjualan + detail + rekam stok,
  // mengurangi stok, semuanya atomik. merchant_id mengikuti sesi (hook).
  const result = await penjualanService.checkout({
    // Harga & modifier sudah dihitung server saat bill dibuat -> _trusted.
    items: bill.detail.map((d) => ({ id_produk: d.ID_PRODUK, qty: d.QTY, unit: d.HARGA_JUAL, modifier_text: d.MODIFIER })),
    id_jenis_bayar,
    id_user: bill.ID_USER,
    bayar,
    diskon,
    keterangan: keterangan || `Open Bill ${bill.NO_BILL}`,
    _trusted: true,
  });

  await bill.update({ STATUS: STATUS.PAID, ID_PENJUALAN: result.id });
  return { ...result, no_bill: bill.NO_BILL };
}

/**
 * Batalkan open bill (OPEN -> CANCELLED). Tidak ada stok yang perlu dikembalikan
 * karena stok memang belum dikurangi saat OPEN.
 */
async function cancel(id) {
  const bill = await OpenBill.findByPk(id);
  if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
  if (bill.STATUS !== STATUS.OPEN) throw new ApiError(400, `Bill berstatus ${bill.STATUS} tidak dapat dibatalkan`);
  await bill.update({ STATUS: STATUS.CANCELLED });
  return { id, status: STATUS.CANCELLED };
}

module.exports = { list, getById, create, update, pay, cancel };
