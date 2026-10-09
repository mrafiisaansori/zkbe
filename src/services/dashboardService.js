const { Op, literal } = require('sequelize');
const {
  Penjualan, DetailPenjualan, Produk, Pengguna, RekamStok, Pembelian, Retur, Supplier,
} = require('../models');
const { todayDate } = require('../utils/helpers');
const { activeMerchantId } = require('../utils/tenancy');
const { LOW_STOCK_THRESHOLD, LOW_STOCK_LIMIT, LOW_STOCK_ORDER } = require('../utils/inventory');
const { remember } = require('../utils/cache');
const reportService = require('./reportService');

function cacheKey(extra = '') {
  const mid = activeMerchantId();
  return `${mid === undefined ? 'all' : mid}:${extra}`;
}

/**
 * Ringkasan dashboard: penjualan hari ini, jumlah transaksi, produk, user,
 * dan produk stok menipis. Angka keuangan & produk/varian terlaris dari
 * reportService (satu tempat sama dengan /laporan/rekap & /laporan/pendapatan)
 * supaya selalu konsisten.
 */
async function summaryFresh() {
  const today = todayDate();
  const d = new Date(today);
  const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

  const [
    todayReport,
    monthReport,
    totalProduk,
    totalUser,
    stokMenipis,
    transaksiTerbaru,
  ] = await Promise.all([
    reportService.rekap({ dari: today, sampai: today }),
    reportService.rekap({ dari: firstOfMonth, sampai: today, limit: 5 }),
    Produk.count(),
    Pengguna.count(),
    Produk.findAll({
      where: { STOK: { [Op.lte]: LOW_STOCK_THRESHOLD } },
      attributes: ['ID', 'NAMA', 'STOK'],
      order: LOW_STOCK_ORDER,
      limit: LOW_STOCK_LIMIT,
    }),
    // Transaksi terbaru (5) — Penjualan ter-scope (find).
    Penjualan.findAll({
      where: { STATUS: 1 },
      attributes: ['ID', 'NO_NOTA', 'NO_NOTA_URUT', 'TANGGAL', 'JAM', 'TOTAL'],
      include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
      order: [['ID', 'DESC']],
      limit: 5,
    }),
  ]);

  const { ringkasan } = todayReport;
  return {
    tanggal: today,
    transaksi_hari_ini: ringkasan.jumlah_transaksi,
    // Penjualan hari ini = OMZET BERSIH (tanpa PPN & service charge).
    pendapatan_hari_ini: ringkasan.omzet,
    laba_hari_ini: ringkasan.laba, // laba kotor hari ini
    qty_terjual_hari_ini: ringkasan.qty,
    rata_rata_transaksi: ringkasan.rata_rata_transaksi,
    ppn_hari_ini: ringkasan.ppn,
    service_hari_ini: ringkasan.service,
    total_dibayar_hari_ini: ringkasan.total_dibayar,
    total_produk: totalProduk,
    total_pengguna: totalUser,
    stok_menipis: stokMenipis,
    produk_terlaris: monthReport.produk_terlaris,
    varian_terlaris: monthReport.varian_terlaris,
    transaksi_terbaru: transaksiTerbaru,
  };
}

async function summary() {
  return remember('dashboard-summary', cacheKey(todayDate()), 10 * 1000, summaryFresh);
}

function emptyMonthlyChart(tahun) {
  return Array.from({ length: 12 }, (_, index) => ({
    bulan: index + 1,
    omzet: 0,
    laba: 0,
  }));
}

/**
 * Grafik laba & omzet bulanan per tahun - meniru showChart() di CI.
 */
async function chartTahunanFresh(tahun) {
  const selectedYear = Number(tahun);
  const data = emptyMonthlyChart(selectedYear);
  const startDate = `${selectedYear}-01-01`;
  const endDate = `${selectedYear}-12-31`;

  const rows = await DetailPenjualan.findAll({
    attributes: [
      [literal('MONTH(`penjualan`.`TANGGAL`)'), 'bulan'],
      [
        literal('SUM(COALESCE(`t_detail_penjualan`.`HARGA_JUAL`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0))'),
        'omzet',
      ],
      [
        literal('SUM((COALESCE(`t_detail_penjualan`.`HARGA_JUAL`, 0) - COALESCE(`t_detail_penjualan`.`HARGA_BELI`, 0)) * COALESCE(`t_detail_penjualan`.`QTY`, 0))'),
        'laba',
      ],
    ],
    include: [{
      model: Penjualan,
      as: 'penjualan',
      attributes: [],
      required: true,
      where: {
        STATUS: 1,
        TANGGAL: { [Op.between]: [startDate, endDate] },
      },
    }],
    group: [literal('MONTH(`penjualan`.`TANGGAL`)')],
    raw: true,
  });

  rows.forEach((row) => {
    const index = Number(row.bulan) - 1;
    if (index < 0 || index >= data.length) return;
    data[index] = {
      bulan: index + 1,
      omzet: Number(row.omzet) || 0,
      laba: Number(row.laba) || 0,
    };
  });

  return { tahun: selectedYear, data };
}

async function chartTahunan(tahun) {
  return remember('dashboard-chart', cacheKey(String(tahun)), 60 * 1000, () => chartTahunanFresh(tahun));
}

/**
 * Dashboard OPERASIONAL untuk role Gudang. SENGAJA tidak memuat data keuangan
 * (omzet, laba, PPN, service charge, penerimaan bruto). Hanya informasi stok &
 * operasional. Semua query otomatis ter-scope merchant_id (find/count hook).
 */
async function gudangSummary() {
  const [
    totalProduk,
    stokMenipis,
    stokMenipisCount,
    produkHabis,
    produkHabisCount,
    riwayatStok,
    pembelianTerbaru,
    returTerbaru,
    transaksiTerbaru,
  ] = await Promise.all([
    Produk.count(),
    Produk.findAll({
      where: { STOK: { [Op.gt]: 0, [Op.lte]: LOW_STOCK_THRESHOLD } },
      attributes: ['ID', 'NAMA', 'STOK'], order: LOW_STOCK_ORDER, limit: LOW_STOCK_LIMIT,
    }),
    Produk.count({ where: { STOK: { [Op.gt]: 0, [Op.lte]: LOW_STOCK_THRESHOLD } } }),
    Produk.findAll({
      where: { STOK: { [Op.lte]: 0 } },
      attributes: ['ID', 'NAMA', 'STOK'], order: [['NAMA', 'ASC']], limit: LOW_STOCK_LIMIT,
    }),
    Produk.count({ where: { STOK: { [Op.lte]: 0 } } }),
    RekamStok.findAll({
      attributes: ['ID', 'JENIS', 'QTY', 'TANGGAL', 'KETERANGAN'],
      include: [{ model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] }],
      order: [['ID', 'DESC']], limit: 8,
    }),
    Pembelian.findAll({
      attributes: ['ID', 'NO_NOTA', 'TANGGAL', 'STATUS'],
      include: [{ model: Supplier, as: 'supplier', attributes: ['ID', 'NAMA'] }],
      order: [['ID', 'DESC']], limit: 5,
    }),
    Retur.findAll({
      attributes: ['ID', 'NO_NOTA', 'TANGGAL', 'STATUS'],
      include: [{ model: Supplier, as: 'supplier', attributes: ['ID', 'NAMA'] }],
      order: [['ID', 'DESC']], limit: 5,
    }),
    Penjualan.findAll({
      where: { STATUS: 1 },
      attributes: ['ID', 'NO_NOTA', 'NO_NOTA_URUT', 'TANGGAL', 'JAM'], // tanpa TOTAL/laba — info keuangan disembunyikan
      include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
      order: [['ID', 'DESC']], limit: 5,
    }),
  ]);

  return {
    tanggal: todayDate(),
    total_produk: totalProduk,
    stok_menipis_count: stokMenipisCount,
    produk_habis_count: produkHabisCount,
    stok_menipis: stokMenipis,
    produk_habis: produkHabis,
    riwayat_stok: riwayatStok,
    pembelian_terbaru: pembelianTerbaru,
    retur_terbaru: returTerbaru,
    transaksi_terbaru: transaksiTerbaru,
  };
}

module.exports = { summary, chartTahunan, gudangSummary };
