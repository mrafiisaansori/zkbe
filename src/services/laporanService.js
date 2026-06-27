const { Op, fn, col, literal } = require('sequelize');
const {
  Penjualan, DetailPenjualan, Produk, Pengguna, JenisBayar, Penyusutan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { currentPlan, hasProFeatures } = require('../utils/plan');
const { LOW_STOCK_THRESHOLD, LOW_STOCK_LIMIT, LOW_STOCK_ORDER } = require('../utils/inventory');

/**
 * Laporan penjualan - meniru getPenjualanByKasirAndTanggal() / filterLaporanPenjualan().
 * Filter: rentang tanggal, kasir (id_user / 'all'), status.
 */
async function penjualan({ tanggal_awal, tanggal_akhir, id_user = 'all', status = 1 }) {
  const where = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };
  if (id_user && id_user !== 'all') where.ID_USER = id_user;

  const rows = await Penjualan.findAll({
    where,
    include: [
      { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
      { model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] },
    ],
    order: [['TANGGAL', 'ASC'], ['ID', 'ASC']],
  });

  // total_dibayar = bruto yang dibayar pelanggan (termasuk PPN & service).
  // omzet = penjualan bersih (tanpa PPN & service) — standar akuntansi/POS.
  const total_dibayar = rows.reduce((s, r) => s + (Number(r.TOTAL) || 0), 0);
  const total_ppn = rows.reduce((s, r) => s + (Number(r.PPN) || 0), 0);
  const total_service = rows.reduce((s, r) => s + (Number(r.SERVICE_CHARGE) || 0), 0);
  const omzet = total_dibayar - total_ppn - total_service;
  return {
    filter: { tanggal_awal, tanggal_akhir, id_user, status },
    jumlah_transaksi: rows.length,
    omzet,                 // penjualan bersih (tanpa pajak & service)
    total_ppn,            // PPN terkumpul (titipan pajak)
    total_service,        // service charge terkumpul
    total_dibayar,        // total bruto yang diterima
    total_penjualan: omzet, // kompatibilitas: total_penjualan = omzet bersih
    data: rows,
  };
}

/**
 * Laporan pendapatan / laba-rugi per rentang tanggal.
 * Laba = SUM((HARGA_JUAL - HARGA_BELI) * QTY) untuk penjualan STATUS=1.
 * Omzet = SUM(HARGA_JUAL * QTY).
 */
async function pendapatan({ tanggal_awal, tanggal_akhir, status = 1 }) {
  const range = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };

  // Header: hitung PPN, service, dan omzet bersih (DPP = TOTAL - PPN - service).
  const headers = await Penjualan.findAll({ where: range, attributes: ['TOTAL', 'PPN', 'SERVICE_CHARGE'] });
  let bruto = 0; let ppn = 0; let service = 0;
  headers.forEach((h) => {
    bruto += Number(h.TOTAL) || 0;
    ppn += Number(h.PPN) || 0;
    service += Number(h.SERVICE_CHARGE) || 0;
  });
  const omzet = bruto - ppn - service; // penjualan bersih (tanpa pajak & service)

  // Detail: modal (HPP) dari harga beli.
  const details = await DetailPenjualan.findAll({
    include: [{ model: Penjualan, as: 'penjualan', attributes: [], where: range, required: true }],
  });
  let modal = 0;
  for (const d of details) modal += d.HARGA_BELI * d.QTY;

  return {
    filter: { tanggal_awal, tanggal_akhir, status },
    omzet,                // penjualan bersih (tanpa PPN & service)
    modal,                // HPP / modal
    laba: omzet - modal,  // laba kotor
    ppn,                  // PPN terkumpul (dilaporkan terpisah)
    service,              // service charge terkumpul
    total_dibayar: bruto, // bruto yang diterima dari pelanggan
    jumlah_item: details.length,
  };
}

/**
 * Laporan stok - daftar produk + stok saat ini.
 */
async function stok() {
  const rows = await Produk.findAll({
    attributes: ['ID', 'NAMA', 'STOK', 'HARGA_BELI', 'HARGA_JUAL', 'BARCODE', 'ID_KATEGORI'],
    order: [['NAMA', 'ASC']],
  });
  const nilai_stok = rows.reduce((s, r) => s + (r.STOK * r.HARGA_BELI), 0);
  return { jumlah_produk: rows.length, nilai_stok, data: rows };
}

/**
 * Laporan penyusutan produk.
 */
async function penyusutan() {
  return Penyusutan.findAll({
    include: [{ model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] }],
    order: [['TANGGAL', 'DESC']],
  });
}

/**
 * Rekapitulasi laporan LENGKAP - KHUSUS plan PRO & BUSINESS.
 * FREE hanya mendapatkan laporan dasar (penjualan/pendapatan/stok di atas).
 * Validasi plan WAJIB di backend. Semua query otomatis ter-scope merchant_id
 * (hook tenancy), jadi tidak akan menampilkan data merchant lain.
 *
 * Menyajikan: omzet bersih, penerimaan bruto, total transaksi, modal/HPP,
 * laba kotor, PPN, service charge, diskon/voucher, penjualan per metode bayar,
 * produk terlaris, produk stok menipis, rekap per kasir, dan rekap harian/bulanan.
 */
async function assertProReport() {
  const plan = await currentPlan();
  if (!hasProFeatures(plan)) {
    throw new ApiError(403, 'Laporan lengkap hanya tersedia untuk plan PRO/BUSINESS. Upgrade ke PRO untuk membuka rekapitulasi lengkap.');
  }
}

async function rekap({
  tanggal_awal, tanggal_akhir, status = 1, top_limit = 10,
}) {
  await assertProReport();
  const range = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };

  // Header transaksi + kasir + metode bayar.
  const headers = await Penjualan.findAll({
    where: range,
    include: [
      { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
      { model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] },
    ],
    order: [['TANGGAL', 'ASC'], ['ID', 'ASC']],
  });

  let bruto = 0; let ppn = 0; let service = 0; let diskon = 0; let voucher = 0;
  const perMetode = new Map();
  const perKasir = new Map();
  const harian = new Map();
  const bulanan = new Map();

  for (const h of headers) {
    const total = Number(h.TOTAL) || 0;
    bruto += total;
    ppn += Number(h.PPN) || 0;
    service += Number(h.SERVICE_CHARGE) || 0;
    diskon += Number(h.DISKON) || 0;
    voucher += Number(h.DISKON_VOUCHER) || 0;

    const metode = h.jenisBayar ? h.jenisBayar.NAMA : '(Tanpa metode)';
    const m = perMetode.get(metode) || { metode, jumlah_transaksi: 0, total: 0 };
    m.jumlah_transaksi += 1; m.total += total; perMetode.set(metode, m);

    const kasir = h.kasir ? h.kasir.NAMA : '(Tanpa kasir)';
    const kasirId = h.kasir ? h.kasir.ID : null;
    const k = perKasir.get(kasir) || { id_user: kasirId, kasir, jumlah_transaksi: 0, total: 0 };
    k.jumlah_transaksi += 1; k.total += total; perKasir.set(kasir, k);

    const tgl = String(h.TANGGAL);
    const d = harian.get(tgl) || { tanggal: tgl, jumlah_transaksi: 0, total: 0 };
    d.jumlah_transaksi += 1; d.total += total; harian.set(tgl, d);

    const bln = tgl.slice(0, 7); // YYYY-MM
    const b = bulanan.get(bln) || { bulan: bln, jumlah_transaksi: 0, total: 0 };
    b.jumlah_transaksi += 1; b.total += total; bulanan.set(bln, b);
  }

  const omzet = bruto - ppn - service; // omzet bersih (tanpa pajak & service)

  // Detail untuk modal/HPP & produk terlaris.
  const details = await DetailPenjualan.findAll({
    include: [
      { model: Penjualan, as: 'penjualan', attributes: [], where: range, required: true },
      { model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] },
    ],
  });

  let modal = 0;
  const perProduk = new Map();
  for (const d of details) {
    const qty = Number(d.QTY) || 0;
    modal += (Number(d.HARGA_BELI) || 0) * qty;
    const nama = d.produk ? d.produk.NAMA : `Produk #${d.ID_PRODUK}`;
    const pid = d.ID_PRODUK;
    const p = perProduk.get(pid) || { id_produk: pid, nama, qty: 0, omzet: 0 };
    p.qty += qty;
    p.omzet += (Number(d.HARGA_JUAL) || 0) * qty;
    perProduk.set(pid, p);
  }

  const produkTerlaris = [...perProduk.values()].sort((a, b) => b.qty - a.qty).slice(0, Number(top_limit) || 10);

  // Sama persis dengan card dashboard: stok <= 10, urut stok terendah, maksimal 10.
  const stokMenipis = await Produk.findAll({
    where: { STOK: { [Op.lte]: LOW_STOCK_THRESHOLD } },
    attributes: ['ID', 'NAMA', 'STOK', 'HARGA_JUAL'],
    order: LOW_STOCK_ORDER,
    limit: LOW_STOCK_LIMIT,
  });

  return {
    filter: { tanggal_awal, tanggal_akhir, status, stok_threshold: LOW_STOCK_THRESHOLD },
    ringkasan: {
      omzet_bersih: omzet,
      penerimaan_bruto: bruto,
      total_transaksi: headers.length,
      total_modal: modal,
      laba_kotor: omzet - modal,
      ppn,
      service_charge: service,
      diskon,
      voucher,
      diskon_voucher_total: diskon + voucher,
    },
    per_metode_bayar: [...perMetode.values()].sort((a, b) => b.total - a.total),
    per_kasir: [...perKasir.values()].sort((a, b) => b.total - a.total),
    produk_terlaris: produkTerlaris,
    produk_stok_menipis: stokMenipis.map((p) => ({
      id: p.ID, nama: p.NAMA, stok: p.STOK, harga_jual: p.HARGA_JUAL,
    })),
    harian: [...harian.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
    bulanan: [...bulanan.values()].sort((a, b) => a.bulan.localeCompare(b.bulan)),
  };
}

// Escape sel CSV (bungkus tanda kutip bila perlu).
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRows(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

/**
 * Export rekap PRO/BUSINESS ke CSV (multi-section dalam satu file).
 * Mengembalikan string CSV (BOM UTF-8 agar rapi di Excel).
 */
async function rekapCsv(query) {
  const r = await rekap(query);
  const lines = [];
  lines.push(csvRows([['REKAP LAPORAN', `${r.filter.tanggal_awal} s/d ${r.filter.tanggal_akhir}`]]));
  lines.push('');
  lines.push(csvRows([
    ['Ringkasan', 'Nilai'],
    ['Omzet bersih', r.ringkasan.omzet_bersih],
    ['Penerimaan bruto', r.ringkasan.penerimaan_bruto],
    ['Total transaksi', r.ringkasan.total_transaksi],
    ['Total modal/HPP', r.ringkasan.total_modal],
    ['Laba kotor', r.ringkasan.laba_kotor],
    ['PPN', r.ringkasan.ppn],
    ['Service charge', r.ringkasan.service_charge],
    ['Diskon', r.ringkasan.diskon],
    ['Voucher', r.ringkasan.voucher],
  ]));
  lines.push('');
  lines.push('Penjualan per metode pembayaran');
  lines.push(csvRows([['Metode', 'Jumlah transaksi', 'Total'],
    ...r.per_metode_bayar.map((x) => [x.metode, x.jumlah_transaksi, x.total])]));
  lines.push('');
  lines.push('Rekap penjualan per kasir');
  lines.push(csvRows([['Kasir', 'Jumlah transaksi', 'Total'],
    ...r.per_kasir.map((x) => [x.kasir, x.jumlah_transaksi, x.total])]));
  lines.push('');
  lines.push('Produk terlaris');
  lines.push(csvRows([['Produk', 'Qty', 'Omzet'],
    ...r.produk_terlaris.map((x) => [x.nama, x.qty, x.omzet])]));
  lines.push('');
  lines.push('Produk stok menipis');
  lines.push(csvRows([['Produk', 'Stok', 'Harga jual'],
    ...r.produk_stok_menipis.map((x) => [x.nama, x.stok, x.harga_jual])]));
  lines.push('');
  lines.push('Rekap harian');
  lines.push(csvRows([['Tanggal', 'Jumlah transaksi', 'Total'],
    ...r.harian.map((x) => [x.tanggal, x.jumlah_transaksi, x.total])]));
  lines.push('');
  lines.push('Rekap bulanan');
  lines.push(csvRows([['Bulan', 'Jumlah transaksi', 'Total'],
    ...r.bulanan.map((x) => [x.bulan, x.jumlah_transaksi, x.total])]));

  return `﻿${lines.join('\n')}`;
}

module.exports = { penjualan, pendapatan, stok, penyusutan, rekap, rekapCsv };
