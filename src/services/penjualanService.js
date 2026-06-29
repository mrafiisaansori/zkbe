const { Op } = require('sequelize');
const {
  sequelize, Penjualan, DetailPenjualan, Produk, Pengguna, JenisBayar, RekamStok, Merchant, KasShift,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { todayDate, nowTime, formatNoNota } = require('../utils/helpers');
const { activeMerchantId } = require('../utils/tenancy');
const taxService = require('./taxService');
const voucherService = require('./voucherService');
const modifierService = require('./modifierService');
const { currentPlan, hasProFeatures, PRO_UPGRADE_MESSAGE } = require('../utils/plan');
const { parsePagination, paginated } = require('../utils/pagination');

// Nomor nota dengan prefix merchant (mis. "TZK-000025"). Unik antar merchant.
async function buildNoNota(id) {
  const mid = activeMerchantId();
  const merchant = mid ? await Merchant.findByPk(mid) : null;
  const prefix = merchant && merchant.INVOICE_PREFIX ? `${merchant.INVOICE_PREFIX}-` : '';
  return `${prefix}${formatNoNota(id)}`;
}

// Bentuk view_penjualan (header + nama kasir + jenis bayar).
const includeHeader = [
  { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
  { model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] },
];

const LIST_ATTRIBUTES = [
  'ID', 'TANGGAL', 'JAM', 'ID_JENIS_BAYAR', 'TOTAL', 'ID_USER', 'KETERANGAN',
  'DISKON', 'PPN', 'SERVICE_CHARGE', 'STATUS', 'STATUS_BAYAR', 'PAYMENT_STATUS',
];

async function list({ tanggal_awal, tanggal_akhir, id_user, id_jenis_bayar, status, page, limit } = {}) {
  const where = {};
  if (tanggal_awal && tanggal_akhir) where.TANGGAL = { [Op.between]: [tanggal_awal, tanggal_akhir] };
  if (id_user) where.ID_USER = id_user;
  if (id_jenis_bayar) where.ID_JENIS_BAYAR = id_jenis_bayar;
  if (status !== undefined) where.STATUS = status;

  const pagination = parsePagination({ page, limit });
  const query = { where, attributes: LIST_ATTRIBUTES, include: includeHeader, order: [['ID', 'DESC']] };
  if (!pagination) return Penjualan.findAll(query);
  const result = await Penjualan.findAndCountAll({
    ...query,
    distinct: true,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginated(result.rows, result.count, pagination);
}

async function getById(id) {
  const p = await Penjualan.findByPk(id, {
    include: [
      ...includeHeader,
      { model: DetailPenjualan, as: 'detail', include: [{ model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] }] },
    ],
  });
  if (!p) throw new ApiError(404, 'Transaksi penjualan tidak ditemukan');
  return p;
}

/**
 * Checkout / bayar - meniru Kasir::bayar() di CI.
 * items: [{ id_produk, qty }]
 * - Validasi stok tiap item.
 * - Insert t_penjualan (header) + t_detail_penjualan + t_rekam_stok (JENIS=2 keluar).
 * - Kurangi STOK m_produk.
 * Dijalankan dalam 1 transaksi DB agar atomik.
 */
// _trusted=true: dipakai pembayaran open bill (harga unit & teks modifier sudah
// dihitung server saat bill dibuat). Endpoint publik/kasir TIDAK pernah set ini.
//
// payment: opsional, untuk transaksi yang dibayar via payment gateway (Midtrans
//   QRIS dinamis). { provider, status, status_bayar } -> transaksi dibuat dengan
//   status bayar PENDING (belum lunas) sampai webhook gateway mengonfirmasi.
//   Default (tanpa payment) = perilaku lama: STATUS_BAYAR='LUNAS'.
async function checkout({
  items, id_jenis_bayar, id_user, bayar, keterangan, diskon = 0, kode_voucher,
  _trusted = false, payment = null, _transaction = null,
}) {
  if (!items || items.length === 0) throw new ApiError(400, 'Keranjang kosong, tidak ada item untuk dibayar');

  // Ambil pengaturan pajak & voucher DI LUAR transaksi (read-only, ter-scope merchant).
  const plan = await currentPlan();
  const proEnabled = hasProFeatures(plan);
  const tax = proEnabled
    ? await taxService.get()
    : { PPN_ENABLED: false, PPN_PERSEN: 0, SERVICE_ENABLED: false, SERVICE_PERSEN: 0 };
  if (kode_voucher && !proEnabled) throw new ApiError(403, PRO_UPGRADE_MESSAGE);

  const run = async (t) => {
    // Ambil & validasi semua produk + hitung diskon per item.
    let subtotal = 0;
    let diskonItemTotal = 0;
    const resolved = [];
    for (const it of items) {
      const produk = await Produk.findByPk(it.id_produk, { transaction: t });
      if (!produk) throw new ApiError(404, `Produk ID ${it.id_produk} tidak ditemukan`);
      if (it.qty <= 0) throw new ApiError(400, `QTY tidak valid untuk produk ${produk.NAMA}`);
      if (produk.STOK < it.qty) throw new ApiError(400, `Stok tidak mencukupi untuk ${produk.NAMA} (tersisa ${produk.STOK})`);
      // Harga unit = harga produk + tambahan modifier/varian.
      let unit; let modText;
      if (_trusted) {
        unit = Number(it.unit) || produk.HARGA_JUAL;
        modText = it.modifier_text || null;
      } else {
        const mod = await modifierService.resolveModifiers(it.modifier_option_ids);
        unit = produk.HARGA_JUAL + mod.extra;
        modText = mod.text;
      }
      const lineBruto = unit * it.qty;
      // Diskon per item DINONAKTIFKAN (selalu 0). Voucher & diskon global tetap berlaku.
      subtotal += lineBruto;
      resolved.push({ produk, qty: it.qty, unit, modText });
    }

    const diskonGlobal = Number(diskon) || 0;
    const afterDiscount = Math.max(0, subtotal - diskonItemTotal - diskonGlobal);

    // Voucher (opsional) dihitung atas nilai setelah diskon item & diskon global.
    let diskonVoucher = 0;
    let kodeVoucher = null;
    if (kode_voucher) {
      const res = await voucherService.validateForSubtotal(kode_voucher, afterDiscount);
      diskonVoucher = res.diskon;
      kodeVoucher = res.voucher.KODE;
    }

    const dpp = Math.max(0, afterDiscount - diskonVoucher); // dasar pengenaan pajak
    const ppn = tax.PPN_ENABLED ? Math.round((dpp * Number(tax.PPN_PERSEN || 0)) / 100) : 0;
    const serviceCharge = tax.SERVICE_ENABLED ? Math.round((dpp * Number(tax.SERVICE_PERSEN || 0)) / 100) : 0;
    const total = dpp + ppn + serviceCharge;

    // Validasi "uang dibayar" hanya untuk pembayaran tunai/manual. Pembayaran via
    // gateway (Midtrans) dikonfirmasi belakangan lewat webhook, jadi dilewati.
    if (!payment && bayar !== undefined && bayar !== null && Number(bayar) < total) {
      throw new ApiError(400, `Nominal bayar (${bayar}) kurang dari total (${total})`);
    }

    // Tag transaksi ke sesi kas (shift) yang sedang OPEN milik kasir ini, bila ada.
    // Null = kasir belum buka sesi -> transaksi masuk bucket "Tanpa Sesi" di laporan.
    const activeShift = id_user
      ? await KasShift.findOne({ where: { ID_USER: id_user, STATUS: 1 }, transaction: t })
      : null;

    const header = await Penjualan.create({
      TANGGAL: todayDate(),
      JAM: nowTime(),
      ID_JENIS_BAYAR: id_jenis_bayar,
      TOTAL: String(total),
      ID_USER: id_user,
      ID_SHIFT: activeShift ? activeShift.ID : null,
      KETERANGAN: keterangan || null,
      DISKON: String(diskonGlobal),
      PPN: ppn,
      SERVICE_CHARGE: serviceCharge,
      KODE_VOUCHER: kodeVoucher,
      DISKON_VOUCHER: diskonVoucher,
      STATUS: 1,
      STATUS_BAYAR: payment ? (payment.status_bayar || 'PENDING') : 'LUNAS',
      PAYMENT_PROVIDER: payment ? payment.provider : null,
      PAYMENT_STATUS: payment ? (payment.status || 'PENDING') : null,
    }, { transaction: t });

    const noNota = await buildNoNota(header.ID);

    for (const r of resolved) {
      await DetailPenjualan.create({
        ID_TRANSAKSI_PENJUALAN: header.ID,
        ID_PRODUK: r.produk.ID,
        HARGA_BELI: r.produk.HARGA_BELI,
        HARGA_JUAL: r.unit, // harga efektif (produk + modifier)
        QTY: r.qty,
        MODIFIER: r.modText,
        DISKON: 0,
      }, { transaction: t });

      await RekamStok.create({
        ID_PRODUK: r.produk.ID,
        JENIS: 2, // keluar (penjualan)
        QTY: r.qty,
        TANGGAL: new Date(),
        KETERANGAN: `Transaksi Penjualan Nomor ${noNota}`,
      }, { transaction: t });

      await r.produk.update({ STOK: r.produk.STOK - r.qty }, { transaction: t });
    }

    const kembalian = bayar !== undefined && bayar !== null ? Number(bayar) - total : null;
    return {
      id: header.ID,
      no_nota: noNota,
      subtotal,
      diskon_item: diskonItemTotal,
      diskon: diskonGlobal,
      diskon_voucher: diskonVoucher,
      kode_voucher: kodeVoucher,
      ppn,
      service_charge: serviceCharge,
      total,
      bayar: bayar !== undefined && bayar !== null ? Number(bayar) : null,
      kembalian,
    };
  };

  if (_transaction) return run(_transaction);
  return sequelize.transaction(run);
}

/**
 * Void / batalkan penjualan - set STATUS=0 dan kembalikan stok.
 * (Sistem CI punya delete_transaksi; di sini diperlakukan sebagai void agar histori tetap ada.)
 */
async function voidPenjualan(id) {
  return sequelize.transaction(async (t) => {
    const header = await Penjualan.findByPk(id, { transaction: t });
    if (!header) throw new ApiError(404, 'Transaksi penjualan tidak ditemukan');
    if (header.STATUS === 0) throw new ApiError(400, 'Transaksi sudah dibatalkan sebelumnya');

    const details = await DetailPenjualan.findAll({ where: { ID_TRANSAKSI_PENJUALAN: id }, transaction: t });
    for (const d of details) {
      const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
      if (produk) {
        await produk.update({ STOK: produk.STOK + d.QTY }, { transaction: t });
        await RekamStok.create({
          ID_PRODUK: d.ID_PRODUK, JENIS: 1, QTY: d.QTY, TANGGAL: new Date(),
          KETERANGAN: `Pembatalan Penjualan Nomor ${formatNoNota(id)}`,
        }, { transaction: t });
      }
    }
    await header.update({ STATUS: 0 }, { transaction: t });
    return { id, status: 0 };
  });
}

module.exports = { list, getById, checkout, voidPenjualan };
