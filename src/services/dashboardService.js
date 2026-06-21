const { Op, literal } = require('sequelize');
const {
  Penjualan, DetailPenjualan, Produk, Pengguna,
} = require('../models');
const { todayDate } = require('../utils/helpers');
const { activeMerchantId } = require('../utils/tenancy');

// PENTING: Sequelize sum()/aggregate TIDAK memicu hook scoping tenant
// (beda dengan find & count). Jadi merchant_id WAJIB disisipkan manual ke
// where agar "penjualan hari ini" tidak bocor menghitung semua merchant.
// Super admin: activeMerchantId() = undefined -> tidak di-filter (global).
function withMerchant(where = {}) {
  const mid = activeMerchantId();
  return mid === undefined ? where : { ...where, MERCHANT_ID: mid };
}

/**
 * Ringkasan dashboard: penjualan hari ini, jumlah transaksi, produk, user,
 * dan produk stok menipis.
 */
async function summary() {
  const today = todayDate();
  const todayWhere = { TANGGAL: today, STATUS: 1 };

  const [
    transaksiHariIni,
    brutoHariIni,
    ppnHariIni,
    serviceHariIni,
    totalProduk,
    totalUser,
    stokMenipis,
  ] = await Promise.all([
    Penjualan.count({ where: { ...todayWhere } }),
    // sum() tidak ter-scope otomatis -> sisipkan merchant_id manual.
    Penjualan.sum('TOTAL', { where: withMerchant({ ...todayWhere }) }),
    Penjualan.sum('PPN', { where: withMerchant({ ...todayWhere }) }),
    Penjualan.sum('SERVICE_CHARGE', { where: withMerchant({ ...todayWhere }) }),
    Produk.count(),
    Pengguna.count(),
    Produk.findAll({
      where: { STOK: { [Op.lte]: 10 } },
      attributes: ['ID', 'NAMA', 'STOK'],
      order: [['STOK', 'ASC']],
      limit: 10,
    }),
  ]);

  const bruto = Number(brutoHariIni) || 0;
  const ppn = Number(ppnHariIni) || 0;
  const service = Number(serviceHariIni) || 0;
  const omzet = bruto - ppn - service; // omzet bersih (tanpa PPN & service)

  // Modal & qty terjual hari ini (untuk laba kotor) — DetailPenjualan ter-scope (find).
  const detailsToday = await DetailPenjualan.findAll({
    attributes: ['HARGA_BELI', 'HARGA_JUAL', 'QTY'],
    include: [{ model: Penjualan, as: 'penjualan', attributes: [], required: true, where: { TANGGAL: today, STATUS: 1 } }],
  });
  let modalToday = 0; let qtyToday = 0;
  detailsToday.forEach((d) => { modalToday += (Number(d.HARGA_BELI) || 0) * d.QTY; qtyToday += Number(d.QTY) || 0; });

  // Produk terlaris bulan ini (top 5 by qty) — agregasi di JS agar robust.
  const d = new Date(today);
  const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const detailsMonth = await DetailPenjualan.findAll({
    attributes: ['ID_PRODUK', 'HARGA_JUAL', 'QTY'],
    include: [
      { model: Penjualan, as: 'penjualan', attributes: [], required: true, where: { TANGGAL: { [Op.between]: [firstOfMonth, today] }, STATUS: 1 } },
      { model: Produk, as: 'produk', attributes: ['NAMA'] },
    ],
  });
  const terlarisMap = {};
  detailsMonth.forEach((row) => {
    const id = row.ID_PRODUK;
    if (!terlarisMap[id]) terlarisMap[id] = { id_produk: id, nama: row.produk ? row.produk.NAMA : `#${id}`, qty: 0, omzet: 0 };
    terlarisMap[id].qty += Number(row.QTY) || 0;
    terlarisMap[id].omzet += (Number(row.HARGA_JUAL) || 0) * (Number(row.QTY) || 0);
  });
  const produkTerlaris = Object.values(terlarisMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Transaksi terbaru (5) — Penjualan ter-scope (find).
  const transaksiTerbaru = await Penjualan.findAll({
    where: { STATUS: 1 },
    attributes: ['ID', 'TANGGAL', 'JAM', 'TOTAL'],
    include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
    order: [['ID', 'DESC']],
    limit: 5,
  });

  return {
    tanggal: today,
    transaksi_hari_ini: transaksiHariIni,
    // Penjualan hari ini = OMZET BERSIH (tanpa PPN & service charge).
    pendapatan_hari_ini: omzet,
    laba_hari_ini: omzet - modalToday, // laba kotor hari ini
    qty_terjual_hari_ini: qtyToday,
    rata_rata_transaksi: transaksiHariIni > 0 ? Math.round(omzet / transaksiHariIni) : 0,
    ppn_hari_ini: ppn,
    service_hari_ini: service,
    total_dibayar_hari_ini: bruto,
    total_produk: totalProduk,
    total_pengguna: totalUser,
    stok_menipis: stokMenipis,
    produk_terlaris: produkTerlaris,
    transaksi_terbaru: transaksiTerbaru,
  };
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
async function chartTahunan(tahun) {
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

module.exports = { summary, chartTahunan };
