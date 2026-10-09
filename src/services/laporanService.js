const { Op, literal } = require('sequelize');
const {
  Penjualan, Produk, Pengguna, JenisBayar, Penyusutan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const {
  currentPlan, hasProFeatures, assertReportDateAllowed,
} = require('../utils/plan');
const { LOW_STOCK_THRESHOLD } = require('../utils/inventory');
const { parsePagination, paginated } = require('../utils/pagination');
const reportService = require('./reportService');

const PENJUALAN_LIST_ATTRIBUTES = [
  'ID', 'NO_NOTA', 'NO_NOTA_URUT', 'TANGGAL', 'JAM', 'ID_JENIS_BAYAR', 'TOTAL', 'ID_USER',
  'KETERANGAN', 'DISKON', 'PPN', 'SERVICE_CHARGE', 'STATUS', 'STATUS_BAYAR',
];

/**
 * Laporan penjualan - meniru getPenjualanByKasirAndTanggal() / filterLaporanPenjualan().
 * Filter: rentang tanggal, kasir (id_user / 'all'), status.
 * Angka ringkasan (jumlah_transaksi/omzet/ppn/service/total_dibayar) dari reportService
 * agar konsisten dengan /laporan/rekap & /dashboard/summary. `data` (list) tetap query lokal.
 */
async function penjualan({ tanggal_awal, tanggal_akhir, id_user = 'all', id_jenis_bayar, id_shift, status = 1, page, limit }) {
  await assertReportDateAllowed(tanggal_awal);
  const where = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };
  if (id_user && id_user !== 'all') where.ID_USER = id_user;
  if (id_jenis_bayar) where.ID_JENIS_BAYAR = id_jenis_bayar;
  if (id_shift) where.ID_SHIFT = id_shift;

  const { ringkasan } = await reportService.rekap({
    dari: tanggal_awal, sampai: tanggal_akhir, status,
    id_user: id_user && id_user !== 'all' ? id_user : undefined,
    id_jenis_bayar, id_shift,
  });

  const pagination = parsePagination({ page, limit });
  const query = {
    where,
    attributes: PENJUALAN_LIST_ATTRIBUTES,
    include: [
      { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
      { model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] },
    ],
    order: [['TANGGAL', 'DESC'], ['ID', 'DESC']],
  };
  let rows;
  let meta;
  if (pagination) {
    const result = await Penjualan.findAndCountAll({
      ...query,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset,
    });
    rows = result.rows;
    meta = paginated([], result.count, pagination).meta;
  } else {
    rows = await Penjualan.findAll(query);
  }

  const payload = {
    filter: { tanggal_awal, tanggal_akhir, id_user, id_jenis_bayar, id_shift, status },
    jumlah_transaksi: ringkasan.jumlah_transaksi,
    omzet: ringkasan.omzet,                 // penjualan bersih (tanpa pajak & service)
    total_ppn: ringkasan.ppn,               // PPN terkumpul (titipan pajak)
    total_service: ringkasan.service,       // service charge terkumpul
    total_dibayar: ringkasan.total_dibayar, // total bruto yang diterima
    total_penjualan: ringkasan.omzet,       // kompatibilitas: total_penjualan = omzet bersih
    data: rows,
  };
  return meta ? { payload, meta } : payload;
}

/**
 * Laporan pendapatan / laba-rugi per rentang tanggal.
 * Angka dari reportService (laba = omzet - modal, modal sudah termasuk modal varian).
 */
async function pendapatan({ tanggal_awal, tanggal_akhir, status = 1 }) {
  await assertReportDateAllowed(tanggal_awal);
  const { ringkasan } = await reportService.rekap({ dari: tanggal_awal, sampai: tanggal_akhir, status });

  return {
    filter: { tanggal_awal, tanggal_akhir, status },
    omzet: ringkasan.omzet,                // penjualan bersih (tanpa PPN & service)
    modal: ringkasan.modal,                // HPP / modal (termasuk modal varian)
    laba: ringkasan.laba,                  // laba kotor
    ppn: ringkasan.ppn,                    // PPN terkumpul (dilaporkan terpisah)
    service: ringkasan.service,            // service charge terkumpul
    total_dibayar: ringkasan.total_dibayar, // bruto yang diterima dari pelanggan
    jumlah_item: ringkasan.jumlah_item,
  };
}

/**
 * Laporan stok - daftar produk + stok saat ini.
 */
async function stok({ search, page, limit } = {}) {
  const where = {};
  if (search) {
    where[Op.or] = [
      { NAMA: { [Op.like]: `%${search}%` } },
      { BARCODE: { [Op.like]: `%${search}%` } },
    ];
  }

  const [agg = {}] = await Produk.findAll({
    where,
    attributes: [
      [literal('COUNT(`m_produk`.`ID`)'), 'jumlah_produk'],
      [literal('COALESCE(SUM(COALESCE(`m_produk`.`STOK`, 0) * COALESCE(`m_produk`.`HARGA_BELI`, 0)), 0)'), 'nilai_stok'],
    ],
    raw: true,
  });

  const pagination = parsePagination({ page, limit });
  const query = {
    where,
    attributes: ['ID', 'NAMA', 'STOK', 'HARGA_BELI', 'HARGA_JUAL', 'BARCODE', 'ID_KATEGORI'],
    order: [['NAMA', 'ASC']],
  };
  let rows;
  let meta;
  if (pagination) {
    const result = await Produk.findAndCountAll({
      ...query,
      limit: pagination.limit,
      offset: pagination.offset,
    });
    rows = result.rows;
    meta = paginated([], result.count, pagination).meta;
  } else {
    rows = await Produk.findAll(query);
  }

  const payload = {
    jumlah_produk: Number(agg.jumlah_produk) || 0,
    nilai_stok: Number(agg.nilai_stok) || 0,
    data: rows,
  };
  return meta ? { payload, meta } : payload;
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
 * Validasi plan WAJIB di backend. Semua query (via reportService) otomatis
 * ter-scope merchant_id (hook tenancy), jadi tidak akan menampilkan data
 * merchant lain.
 *
 * Menyajikan: omzet bersih, penerimaan bruto, total transaksi, modal/HPP,
 * laba kotor, PPN, service charge, diskon/voucher, penjualan per metode bayar,
 * produk & varian terlaris, produk stok menipis, rekap per kasir, dan rekap
 * harian/bulanan. Semua angka kecuali harian/bulanan berasal dari reportService.
 */
async function assertProReport() {
  const plan = await currentPlan();
  if (!hasProFeatures(plan)) {
    throw new ApiError(403, 'Laporan lengkap hanya tersedia untuk plan PRO/BUSINESS. Upgrade ke PRO untuk membuka rekapitulasi lengkap.');
  }
}

// Rekap harian/bulanan (breakdown per tanggal/bulan) - khusus endpoint ini,
// tidak dipakai endpoint lain sehingga tetap lokal (bukan di reportService).
async function harianBulanan(range) {
  const [harianRows, bulananRows] = await Promise.all([
    Penjualan.findAll({
      where: range,
      attributes: [
        ['TANGGAL', 'tanggal'],
        [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'total'],
      ],
      group: ['TANGGAL'],
      order: [['TANGGAL', 'ASC']],
      raw: true,
    }),
    Penjualan.findAll({
      where: range,
      attributes: [
        [literal("DATE_FORMAT(`t_penjualan`.`TANGGAL`, '%Y-%m')"), 'bulan'],
        [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'total'],
      ],
      group: [literal("DATE_FORMAT(`t_penjualan`.`TANGGAL`, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(`t_penjualan`.`TANGGAL`, '%Y-%m')"), 'ASC']],
      raw: true,
    }),
  ]);
  return {
    harian: harianRows.map((row) => ({
      tanggal: String(row.tanggal),
      jumlah_transaksi: Number(row.jumlah_transaksi) || 0,
      total: Number(row.total) || 0,
    })),
    bulanan: bulananRows.map((row) => ({
      bulan: row.bulan,
      jumlah_transaksi: Number(row.jumlah_transaksi) || 0,
      total: Number(row.total) || 0,
    })),
  };
}

async function rekap({
  tanggal_awal, tanggal_akhir, status = 1, top_limit = 10,
}) {
  await assertProReport();
  const range = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };

  const [shared, { harian, bulanan }] = await Promise.all([
    reportService.rekap({ dari: tanggal_awal, sampai: tanggal_akhir, status, limit: top_limit }),
    harianBulanan(range),
  ]);
  const { ringkasan } = shared;

  return {
    filter: { tanggal_awal, tanggal_akhir, status, stok_threshold: LOW_STOCK_THRESHOLD },
    ringkasan: {
      omzet_bersih: ringkasan.omzet,
      penerimaan_bruto: ringkasan.total_dibayar,
      total_transaksi: ringkasan.jumlah_transaksi,
      total_modal: ringkasan.modal,
      laba_kotor: ringkasan.laba,
      ppn: ringkasan.ppn,
      service_charge: ringkasan.service,
      diskon: ringkasan.diskon,
      voucher: ringkasan.voucher,
      diskon_voucher_total: ringkasan.diskon + ringkasan.voucher,
    },
    per_metode_bayar: shared.per_metode_bayar,
    per_kasir: shared.per_kasir,
    produk_terlaris: shared.produk_terlaris,
    varian_terlaris: shared.varian_terlaris,
    produk_stok_menipis: shared.produk_stok_menipis,
    harian,
    bulanan,
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
