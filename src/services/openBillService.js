const { Op } = require('sequelize');
const {
  sequelize, OpenBill, OpenBillDetail, OpenBillPayment, Produk, Pengguna, Merchant, Penjualan, JenisBayar,
  PaymentGatewaySetting, PaymentLog,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId } = require('../utils/tenancy');
const { currentPlan, hasProFeatures, isBusiness } = require('../utils/plan');
const penjualanService = require('./penjualanService');
const midtrans = require('./midtransService');
const modifierService = require('./modifierService');
const { parsePagination, paginated } = require('../utils/pagination');

// Open Bill hanya untuk plan PRO/BUSINESS. Divalidasi di backend (bukan sekadar UI).
async function assertPro() {
  const plan = await currentPlan();
  if (!hasProFeatures(plan)) {
    throw new ApiError(403, 'Fitur Open Bill hanya tersedia di plan PRO. Upgrade ke PRO untuk menggunakannya.');
  }
}

async function assertBusiness() {
  const plan = await currentPlan();
  if (!isBusiness(plan)) {
    throw new ApiError(403, 'Pembayaran QRIS Midtrans hanya tersedia untuk merchant plan BUSINESS.');
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
  {
    model: OpenBillPayment,
    as: 'payments',
    include: [
      { model: Penjualan, as: 'penjualan', attributes: ['ID', 'TANGGAL', 'JAM', 'TOTAL'] },
      { model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] },
    ],
  },
];
const LIST_ATTRIBUTES = ['ID', 'NO_BILL', 'CUSTOMER_NAME', 'TABLE_NO', 'NOTE', 'STATUS', 'TOTAL', 'ID_USER', 'ID_PENJUALAN', 'CREATED_AT'];

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

function paidQty(detail) {
  return Number(detail.PAID_QTY || 0);
}

function remainingQty(detail) {
  return Math.max(0, Number(detail.QTY || 0) - paidQty(detail));
}

function remainingTotal(details) {
  return (details || []).reduce((sum, d) => sum + (remainingQty(d) * Number(d.HARGA_JUAL || 0)), 0);
}

function hasPaidDetail(details) {
  return (details || []).some((d) => paidQty(d) > 0);
}

async function nextSplitNo(idOpenBill, t) {
  const count = await OpenBillPayment.count({ where: { ID_OPEN_BILL: idOpenBill }, transaction: t });
  return count + 1;
}

async function createSplitPayment({ bill, result, id_jenis_bayar, bayar, payer_name, note }, t) {
  const splitNo = await nextSplitNo(bill.ID, t);
  await OpenBillPayment.create({
    ID_OPEN_BILL: bill.ID,
    ID_PENJUALAN: result.id,
    SPLIT_NO: splitNo,
    PAYER_NAME: payer_name || `Split ${splitNo}`,
    TOTAL: result.total,
    ID_JENIS_BAYAR: id_jenis_bayar,
    BAYAR: result.bayar,
    KEMBALIAN: result.kembalian,
    NOTE: note || null,
    PAYMENT_STATUS: 'PAID',
  }, { transaction: t });
  return splitNo;
}

function buildGatewayOrderId(merchantId, transactionId) {
  return `ZK-${merchantId}-${transactionId}-${Date.now()}`;
}

function selectedPayload(selected) {
  return selected.map(({ detail, qty }) => ({ id_open_bill_detail: detail.ID, qty }));
}

async function resolveSelectedDetails(idOpenBill, items, t) {
  const details = await OpenBillDetail.findAll({ where: { ID_OPEN_BILL: idOpenBill }, transaction: t, lock: t.LOCK.UPDATE });
  if (!details || details.length === 0) throw new ApiError(400, 'Bill tidak memiliki item');

  const detailById = new Map(details.map((d) => [Number(d.ID), d]));
  const requested = new Map();
  for (const it of items || []) {
    const detailId = Number(it.id_open_bill_detail);
    requested.set(detailId, (requested.get(detailId) || 0) + Number(it.qty));
  }

  const selected = [];
  for (const [detailId, qty] of requested.entries()) {
    const detail = detailById.get(detailId);
    if (!detail) throw new ApiError(404, `Item bill ID ${detailId} tidak ditemukan`);
    if (!(qty > 0)) throw new ApiError(400, 'Qty split harus lebih dari 0');
    const remaining = remainingQty(detail);
    if (qty > remaining) {
      throw new ApiError(400, `Qty split melebihi sisa item ${detail.ID_PRODUK}. Sisa: ${remaining}`);
    }
    selected.push({ detail, qty });
  }
  if (selected.length === 0) throw new ApiError(400, 'Pilih minimal satu item untuk split bill');
  return { details, selected };
}

async function applySelectedAsPaid(idOpenBill, itemsPayload, t) {
  const { selected } = await resolveSelectedDetails(idOpenBill, itemsPayload, t);
  for (const { detail, qty } of selected) {
    await detail.update({ PAID_QTY: paidQty(detail) + qty }, { transaction: t });
  }
  const refreshedDetails = await OpenBillDetail.findAll({ where: { ID_OPEN_BILL: idOpenBill }, transaction: t });
  return remainingTotal(refreshedDetails);
}

async function getById(id) {
  // findByPk ter-scope merchant otomatis (hook) -> bill merchant lain => 404.
  const bill = await OpenBill.findByPk(id, { include: includeFull });
  if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
  return bill;
}

async function list({ status, search, page, limit } = {}) {
  const where = {};
  if (status) where.STATUS = status;
  if (search) {
    where[Op.or] = [
      { CUSTOMER_NAME: { [Op.like]: `%${search}%` } },
      { TABLE_NO: { [Op.like]: `%${search}%` } },
      { NO_BILL: { [Op.like]: `%${search}%` } },
    ];
  }
  const pagination = parsePagination({ page, limit });
  const query = {
    where,
    attributes: LIST_ATTRIBUTES,
    include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
    order: [['ID', 'DESC']],
  };
  if (!pagination) return OpenBill.findAll(query);
  const result = await OpenBill.findAndCountAll({
    ...query,
    distinct: true,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginated(result.rows, result.count, pagination);
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
      const existingDetails = await OpenBillDetail.findAll({ where: { ID_OPEN_BILL: id }, transaction: t });
      if (hasPaidDetail(existingDetails)) {
        throw new ApiError(400, 'Item bill sudah pernah dibayar sebagian, item tidak dapat diubah. Silakan bayar sisa bill atau batalkan bill.');
      }
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
async function pay(id, { id_jenis_bayar, bayar, keterangan, diskon = 0, id_user }) {
  return sequelize.transaction(async (t) => {
    const bill = await OpenBill.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
    if (bill.STATUS !== STATUS.OPEN) throw new ApiError(400, `Bill berstatus ${bill.STATUS} tidak dapat dibayar`);

    const details = await OpenBillDetail.findAll({ where: { ID_OPEN_BILL: id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!details || details.length === 0) throw new ApiError(400, 'Bill tidak memiliki item');

    const remainingDetails = details
      .map((d) => ({ detail: d, qty: remainingQty(d) }))
      .filter((d) => d.qty > 0);
    if (remainingDetails.length === 0) throw new ApiError(400, 'Semua item bill sudah dibayar');

    // checkout() memvalidasi stok, membuat t_penjualan + detail + rekam stok,
    // mengurangi stok, semuanya atomik. merchant_id mengikuti sesi (hook).
    const result = await penjualanService.checkout({
      // Harga & modifier sudah dihitung server saat bill dibuat -> _trusted.
      items: remainingDetails.map(({ detail, qty }) => ({
        id_produk: detail.ID_PRODUK,
        qty,
        unit: detail.HARGA_JUAL,
        modifier_text: detail.MODIFIER,
      })),
      id_jenis_bayar,
      id_user: id_user || bill.ID_USER,
      bayar,
      diskon,
      keterangan: keterangan || `Open Bill ${bill.NO_BILL}`,
      _trusted: true,
      _transaction: t,
    });

    for (const d of details) {
      await d.update({ PAID_QTY: Number(d.QTY || 0) }, { transaction: t });
    }

    let splitNo = null;
    if (hasPaidDetail(details)) {
      splitNo = await createSplitPayment({
        bill,
        result,
        id_jenis_bayar,
        bayar,
        payer_name: 'Sisa Bill',
        note: keterangan || `Pelunasan sisa ${bill.NO_BILL}`,
      }, t);
    }

    await bill.update({ STATUS: STATUS.PAID, ID_PENJUALAN: result.id }, { transaction: t });
    return {
      ...result,
      no_bill: bill.NO_BILL,
      split_no: splitNo,
      bill_status: STATUS.PAID,
      remaining_total: 0,
    };
  });
}

async function payPartial(id, {
  payer_name, items, id_jenis_bayar, bayar, keterangan, diskon = 0, id_user,
}) {
  // Split Bill adalah fitur PRO. Dicek di sini (bukan cuma di frontend) supaya
  // tetap aman walau merchant sempat PRO lalu turun ke FREE (plan expired) saat
  // bill masih terbuka.
  await assertPro();
  return sequelize.transaction(async (t) => {
    const bill = await OpenBill.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
    if (bill.STATUS !== STATUS.OPEN) throw new ApiError(400, `Bill berstatus ${bill.STATUS} tidak dapat dibayar sebagian`);

    const { selected } = await resolveSelectedDetails(id, items, t);

    const result = await penjualanService.checkout({
      items: selected.map(({ detail, qty }) => ({
        id_produk: detail.ID_PRODUK,
        qty,
        unit: detail.HARGA_JUAL,
        modifier_text: detail.MODIFIER,
      })),
      id_jenis_bayar,
      id_user: id_user || bill.ID_USER,
      bayar,
      diskon,
      keterangan: keterangan || `Split Bill ${bill.NO_BILL}${payer_name ? ` - ${payer_name}` : ''}`,
      _trusted: true,
      _transaction: t,
    });

    await applySelectedAsPaid(id, selectedPayload(selected), t);

    const splitNo = await createSplitPayment({
      bill,
      result,
      id_jenis_bayar,
      bayar,
      payer_name,
      note: keterangan || null,
    }, t);

    const refreshedDetails = await OpenBillDetail.findAll({ where: { ID_OPEN_BILL: id }, transaction: t });
    const remaining = remainingTotal(refreshedDetails);
    const finalStatus = remaining <= 0 ? STATUS.PAID : STATUS.OPEN;
    const billPatch = finalStatus === STATUS.PAID
      ? { STATUS: STATUS.PAID, ID_PENJUALAN: result.id }
      : { STATUS: STATUS.OPEN };
    await bill.update(billPatch, { transaction: t });

    return {
      ...result,
      no_bill: bill.NO_BILL,
      split_no: splitNo,
      payer_name: payer_name || `Split ${splitNo}`,
      bill_status: finalStatus,
      remaining_total: remaining,
    };
  });
}

async function createPartialQris(id, {
  payer_name, items, id_jenis_bayar, keterangan, diskon = 0, customer_name, id_user,
}) {
  await assertBusiness();
  const merchantId = activeMerchantId();
  if (!merchantId) throw new ApiError(400, 'Konteks merchant tidak ditemukan.');

  return sequelize.transaction(async (t) => {
    const bill = await OpenBill.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bill) throw new ApiError(404, 'Open bill tidak ditemukan');
    if (bill.STATUS !== STATUS.OPEN) throw new ApiError(400, `Bill berstatus ${bill.STATUS} tidak dapat dibayar sebagian`);

    const { selected } = await resolveSelectedDetails(id, items, t);
    const result = await penjualanService.checkout({
      items: selected.map(({ detail, qty }) => ({
        id_produk: detail.ID_PRODUK,
        qty,
        unit: detail.HARGA_JUAL,
        modifier_text: detail.MODIFIER,
      })),
      id_jenis_bayar,
      id_user: id_user || bill.ID_USER,
      diskon,
      keterangan: keterangan || `Split Bill ${bill.NO_BILL}${payer_name ? ` - ${payer_name}` : ''}`,
      _trusted: true,
      payment: { provider: 'midtrans', status: 'PENDING', status_bayar: 'PENDING' },
      _transaction: t,
    });

    const orderId = buildGatewayOrderId(merchantId, result.id);
    await Penjualan.update(
      { MIDTRANS_ORDER_ID: orderId, PAYMENT_STATUS: 'PENDING' },
      { where: { ID: result.id }, transaction: t },
    );

    const splitNo = await nextSplitNo(bill.ID, t);
    await OpenBillPayment.create({
      ID_OPEN_BILL: bill.ID,
      ID_PENJUALAN: result.id,
      SPLIT_NO: splitNo,
      PAYER_NAME: payer_name || `Orang ${splitNo}`,
      TOTAL: result.total,
      ID_JENIS_BAYAR: id_jenis_bayar,
      BAYAR: null,
      KEMBALIAN: null,
      NOTE: keterangan || null,
      ITEMS_JSON: JSON.stringify(selectedPayload(selected)),
      PAYMENT_PROVIDER: 'midtrans',
      PAYMENT_STATUS: 'PENDING',
    }, { transaction: t });

    await PaymentLog.create({
      ID_PENJUALAN: result.id,
      PROVIDER: 'midtrans',
      ORDER_ID: orderId,
      EVENT: 'split_bill_charge_request',
      PAYMENT_STATUS: 'PENDING',
      AMOUNT: result.total,
      RAW: JSON.stringify({ order_id: orderId, gross_amount: result.total, no_bill: bill.NO_BILL }),
    }, { transaction: t });

    const setting = await PaymentGatewaySetting.findOne({ transaction: t });
    try {
      const charge = await midtrans.chargeQris({
        orderId,
        grossAmount: result.total,
        customerName: customer_name || payer_name || bill.CUSTOMER_NAME,
        setting,
      });

      const expiredAt = charge.expiryTime ? new Date(charge.expiryTime.replace(' ', 'T')) : null;
      await Penjualan.update(
        {
          MIDTRANS_TRANSACTION_ID: charge.transactionId,
          PAYMENT_STATUS: 'PENDING',
          EXPIRED_AT: Number.isNaN(expiredAt?.getTime()) ? null : expiredAt,
        },
        { where: { ID: result.id }, transaction: t },
      );

      await PaymentLog.create({
        ID_PENJUALAN: result.id,
        PROVIDER: 'midtrans',
        ORDER_ID: orderId,
        TRANSACTION_ID: charge.transactionId,
        EVENT: 'split_bill_charge_response',
        PAYMENT_STATUS: 'PENDING',
        AMOUNT: result.total,
        RAW: JSON.stringify(charge.raw),
      }, { transaction: t });

      return {
        transaction_id: result.id,
        no_nota: result.no_nota,
        order_id: orderId,
        provider: 'midtrans',
        payment_status: 'PENDING',
        gross_amount: result.total,
        qr_string: charge.qrString,
        qr_url: charge.qrUrl,
        expiry_time: charge.expiryTime,
      };
    } catch (err) {
      try { await penjualanService.voidPenjualan(result.id); } catch (_) { /* abaikan */ }
      throw new ApiError(err.statusCode || 502, err.message || 'Gagal membuat QRIS Midtrans.');
    }
  });
}

async function applyGatewayPaymentStatus(idPenjualan, status) {
  const payment = await OpenBillPayment.findOne({ where: { ID_PENJUALAN: idPenjualan, PAYMENT_PROVIDER: 'midtrans' } });
  if (!payment) return null;
  if (payment.PAYMENT_STATUS === status) return payment;

  return sequelize.transaction(async (t) => {
    const locked = await OpenBillPayment.findByPk(payment.ID, { transaction: t, lock: t.LOCK.UPDATE });
    if (!locked || locked.PAYMENT_STATUS === status) return locked;
    const bill = await OpenBill.findByPk(locked.ID_OPEN_BILL, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bill) return locked;

    if (status === 'PAID') {
      const payload = JSON.parse(locked.ITEMS_JSON || '[]');
      const remaining = await applySelectedAsPaid(bill.ID, payload, t);
      await locked.update({ PAYMENT_STATUS: 'PAID', BAYAR: locked.TOTAL, KEMBALIAN: 0 }, { transaction: t });
      if (remaining <= 0) await bill.update({ STATUS: STATUS.PAID, ID_PENJUALAN: idPenjualan }, { transaction: t });
    } else {
      await locked.update({ PAYMENT_STATUS: status }, { transaction: t });
    }
    return locked;
  });
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

module.exports = {
  list, getById, create, update, pay, payPartial, createPartialQris,
  applyGatewayPaymentStatus, cancel,
};
