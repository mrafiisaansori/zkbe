const { Op, col, literal } = require('sequelize');
const {
  Penjualan, DetailPenjualan, Produk, Pengguna, JenisBayar,
} = require('../models');
const { withMerchantScope } = require('../utils/tenancy');
const { LOW_STOCK_THRESHOLD, LOW_STOCK_LIMIT, LOW_STOCK_ORDER } = require('../utils/inventory');

/**
 * Satu-satunya tempat perhitungan laporan (omzet, modal, laba, produk/varian
 * terlaris, per metode bayar, per kasir, stok menipis). Dipakai oleh
 * /laporan/rekap, /laporan/pendapatan, /laporan/penjualan, dan /dashboard/summary
 * supaya angkanya SELALU konsisten - fitur baru cukup ditambah di sini.
 *
 * Modal (HARGA_BELI baris) sudah termasuk modal opsi varian (lihat
 * openBillService/penjualanService saat insert detail transaksi).
 *
 * Tidak melakukan validasi plan (PRO/FREE) - itu tetap tanggung jawab
 * endpoint pemanggil, sama seperti sebelum unifikasi ini.
 */

// Varian/opsi modifier terlaris - dibaca dari snapshot MODIFIER_DETAIL (JSON
// per baris), bukan dihitung ulang dari master modifier.
async function varianTerlaris(detailWhere, limit) {
  const rows = await DetailPenjualan.findAll({
    attributes: ['QTY', 'MODIFIER_DETAIL'],
    where: { MODIFIER_DETAIL: { [Op.ne]: null } },
    include: [{ model: Penjualan, as: 'penjualan', attributes: [], where: detailWhere, required: true }],
    raw: true,
  });

  const perVarian = new Map();
  for (const row of rows) {
    let opts;
    try { opts = JSON.parse(row.MODIFIER_DETAIL); } catch (_) { opts = null; }
    if (!Array.isArray(opts)) continue;
    const qty = Number(row.QTY) || 0;
    for (const o of opts) {
      const key = `${o.grup || ''}||${o.nama}`;
      const v = perVarian.get(key) || { nama: o.nama, grup: o.grup || null, qty: 0, omzet: 0 };
      v.qty += qty;
      v.omzet += (Number(o.harga) || 0) * qty;
      perVarian.set(key, v);
    }
  }
  return [...perVarian.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

async function rekapInner({
  dari, sampai, limit = 10, id_user, id_jenis_bayar, id_shift, status = 1,
}) {
  const where = { TANGGAL: { [Op.between]: [dari, sampai] }, STATUS: status };
  if (id_user) where.ID_USER = id_user;
  if (id_jenis_bayar) where.ID_JENIS_BAYAR = id_jenis_bayar;
  if (id_shift) where.ID_SHIFT = id_shift;
  const topLimit = Math.min(100, Math.max(1, Number(limit) || 10));

  const [
    headerRows, perMetodeRows, perKasirRows, detailAggRows, produkRows, stokMenipis,
  ] = await Promise.all([
    Penjualan.findAll({
      where,
      attributes: [
        [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'bruto'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`PPN`, 0)), 0)'), 'ppn'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`SERVICE_CHARGE`, 0)), 0)'), 'service'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`DISKON`, 0)), 0)'), 'diskon'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`DISKON_VOUCHER`, 0)), 0)'), 'voucher'],
      ],
      raw: true,
    }),
    Penjualan.findAll({
      where,
      attributes: [
        [col('jenisBayar.NAMA'), 'metode'],
        [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'total'],
      ],
      include: [{ model: JenisBayar, as: 'jenisBayar', attributes: [], required: false }],
      group: ['jenisBayar.ID', 'jenisBayar.NAMA'],
      raw: true,
    }),
    Penjualan.findAll({
      where,
      attributes: [
        [col('kasir.ID'), 'id_user'],
        [col('kasir.NAMA'), 'kasir'],
        [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'total'],
      ],
      include: [{ model: Pengguna, as: 'kasir', attributes: [], required: false }],
      group: ['kasir.ID', 'kasir.NAMA'],
      raw: true,
    }),
    DetailPenjualan.findAll({
      attributes: [
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`HARGA_BELI`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'modal'],
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'qty'],
        [literal('COUNT(`t_detail_penjualan`.`ID`)'), 'jumlah_item'],
      ],
      include: [{ model: Penjualan, as: 'penjualan', attributes: [], where, required: true }],
      raw: true,
    }),
    DetailPenjualan.findAll({
      attributes: [
        'ID_PRODUK',
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'qty'],
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`HARGA_JUAL`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'omzet'],
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`HARGA_VARIAN`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'omzet_varian'],
      ],
      include: [
        { model: Penjualan, as: 'penjualan', attributes: [], where, required: true },
        { model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] },
      ],
      group: ['t_detail_penjualan.ID_PRODUK', 'produk.ID', 'produk.NAMA'],
      order: [[literal('qty'), 'DESC']],
      limit: topLimit,
      raw: true,
      nest: true,
    }),
    Produk.findAll({
      where: { STOK: { [Op.lte]: LOW_STOCK_THRESHOLD } },
      attributes: ['ID', 'NAMA', 'STOK', 'HARGA_JUAL'],
      order: LOW_STOCK_ORDER,
      limit: LOW_STOCK_LIMIT,
    }),
  ]);

  const header = headerRows[0] || {};
  const jumlah_transaksi = Number(header.jumlah_transaksi) || 0;
  const bruto = Number(header.bruto) || 0;
  const ppn = Number(header.ppn) || 0;
  const service = Number(header.service) || 0;
  const diskon = Number(header.diskon) || 0;
  const voucher = Number(header.voucher) || 0;
  const omzet = bruto - ppn - service; // penjualan bersih (tanpa pajak & service)

  const detailAgg = detailAggRows[0] || {};
  const modal = Number(detailAgg.modal) || 0; // HPP, sudah termasuk modal varian
  const qty = Number(detailAgg.qty) || 0;
  const jumlah_item = Number(detailAgg.jumlah_item) || 0;
  const laba = omzet - modal;

  return {
    ringkasan: {
      omzet, modal, laba, ppn, service,
      total_dibayar: bruto,
      jumlah_transaksi,
      rata_rata_transaksi: jumlah_transaksi > 0 ? Math.round(omzet / jumlah_transaksi) : 0,
      diskon, voucher, qty, jumlah_item,
    },
    produk_terlaris: produkRows.map((row) => ({
      id_produk: row.ID_PRODUK,
      nama: row.produk?.NAMA || `Produk #${row.ID_PRODUK}`,
      qty: Number(row.qty) || 0,
      omzet: Number(row.omzet) || 0,
      omzet_varian: Number(row.omzet_varian) || 0,
    })),
    varian_terlaris: await varianTerlaris(where, topLimit),
    per_metode_bayar: perMetodeRows.map((row) => ({
      metode: row.metode || '(Tanpa metode)',
      jumlah_transaksi: Number(row.jumlah_transaksi) || 0,
      total: Number(row.total) || 0,
    })).sort((a, b) => b.total - a.total),
    per_kasir: perKasirRows.map((row) => ({
      id_user: row.id_user == null ? null : Number(row.id_user),
      kasir: row.kasir || '(Tanpa kasir)',
      jumlah_transaksi: Number(row.jumlah_transaksi) || 0,
      total: Number(row.total) || 0,
    })).sort((a, b) => b.total - a.total),
    produk_stok_menipis: stokMenipis.map((p) => ({
      id: p.ID, nama: p.NAMA, stok: p.STOK, harga_jual: p.HARGA_JUAL,
    })),
  };
}

async function rekap(opts = {}) {
  const { merchantId } = opts;
  if (merchantId !== undefined && merchantId !== null) {
    return withMerchantScope(merchantId, () => rekapInner(opts));
  }
  return rekapInner(opts);
}

module.exports = { rekap };
