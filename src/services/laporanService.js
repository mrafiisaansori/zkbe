const { Op, fn, col, literal } = require('sequelize');
const {
  Penjualan, DetailPenjualan, Produk, Pengguna, JenisBayar, Penyusutan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { currentPlan, hasProFeatures } = require('../utils/plan');
const { LOW_STOCK_THRESHOLD, LOW_STOCK_LIMIT, LOW_STOCK_ORDER } = require('../utils/inventory');
const { parsePagination, paginated } = require('../utils/pagination');

const PENJUALAN_LIST_ATTRIBUTES = [
  'ID', 'TANGGAL', 'JAM', 'ID_JENIS_BAYAR', 'TOTAL', 'ID_USER',
  'KETERANGAN', 'DISKON', 'PPN', 'SERVICE_CHARGE', 'STATUS', 'STATUS_BAYAR',
];

/**
 * Laporan penjualan - meniru getPenjualanByKasirAndTanggal() / filterLaporanPenjualan().
 * Filter: rentang tanggal, kasir (id_user / 'all'), status.
 */
async function penjualan({ tanggal_awal, tanggal_akhir, id_user = 'all', id_jenis_bayar, status = 1, page, limit }) {
  const where = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };
  if (id_user && id_user !== 'all') where.ID_USER = id_user;
  if (id_jenis_bayar) where.ID_JENIS_BAYAR = id_jenis_bayar;

  const [agg = {}] = await Penjualan.findAll({
    where,
    attributes: [
      [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'total_dibayar'],
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`PPN`, 0)), 0)'), 'total_ppn'],
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`SERVICE_CHARGE`, 0)), 0)'), 'total_service'],
    ],
    raw: true,
  });

  const pagination = parsePagination({ page, limit });
  const query = {
    where,
    attributes: PENJUALAN_LIST_ATTRIBUTES,
    include: [
      { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
      { model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] },
    ],
    order: [['TANGGAL', 'ASC'], ['ID', 'ASC']],
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

  // total_dibayar = bruto yang dibayar pelanggan (termasuk PPN & service).
  // omzet = penjualan bersih (tanpa PPN & service) — standar akuntansi/POS.
  const total_dibayar = Number(agg.total_dibayar) || 0;
  const total_ppn = Number(agg.total_ppn) || 0;
  const total_service = Number(agg.total_service) || 0;
  const omzet = total_dibayar - total_ppn - total_service;
  const payload = {
    filter: { tanggal_awal, tanggal_akhir, id_user, id_jenis_bayar, status },
    jumlah_transaksi: Number(agg.jumlah_transaksi) || 0,
    omzet,                 // penjualan bersih (tanpa pajak & service)
    total_ppn,            // PPN terkumpul (titipan pajak)
    total_service,        // service charge terkumpul
    total_dibayar,        // total bruto yang diterima
    total_penjualan: omzet, // kompatibilitas: total_penjualan = omzet bersih
    data: rows,
  };
  return meta ? { payload, meta } : payload;
}

/**
 * Laporan pendapatan / laba-rugi per rentang tanggal.
 * Laba = SUM((HARGA_JUAL - HARGA_BELI) * QTY) untuk penjualan STATUS=1.
 * Omzet = SUM(HARGA_JUAL * QTY).
 */
async function pendapatan({ tanggal_awal, tanggal_akhir, status = 1 }) {
  const range = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };

  // Header: hitung PPN, service, dan omzet bersih (DPP = TOTAL - PPN - service).
  const [headerAgg = {}] = await Penjualan.findAll({
    where: range,
    attributes: [
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'bruto'],
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`PPN`, 0)), 0)'), 'ppn'],
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`SERVICE_CHARGE`, 0)), 0)'), 'service'],
    ],
    raw: true,
  });
  const bruto = Number(headerAgg.bruto) || 0;
  const ppn = Number(headerAgg.ppn) || 0;
  const service = Number(headerAgg.service) || 0;
  const omzet = bruto - ppn - service; // penjualan bersih (tanpa pajak & service)

  // Detail: modal (HPP) dari harga beli.
  const [detailAgg = {}] = await DetailPenjualan.findAll({
    attributes: [
      [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`HARGA_BELI`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'modal'],
      [literal('COUNT(`t_detail_penjualan`.`ID`)'), 'jumlah_item'],
    ],
    include: [{ model: Penjualan, as: 'penjualan', attributes: [], where: range, required: true }],
    raw: true,
  });
  const modal = Number(detailAgg.modal) || 0;

  return {
    filter: { tanggal_awal, tanggal_akhir, status },
    omzet,                // penjualan bersih (tanpa PPN & service)
    modal,                // HPP / modal
    laba: omzet - modal,  // laba kotor
    ppn,                  // PPN terkumpul (dilaporkan terpisah)
    service,              // service charge terkumpul
    total_dibayar: bruto, // bruto yang diterima dari pelanggan
    jumlah_item: Number(detailAgg.jumlah_item) || 0,
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

async function rekapLegacy({
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

async function rekap({
  tanggal_awal, tanggal_akhir, status = 1, top_limit = 10,
}) {
  await assertProReport();
  const range = { TANGGAL: { [Op.between]: [tanggal_awal, tanggal_akhir] }, STATUS: status };
  const topLimit = Math.min(100, Math.max(1, Number(top_limit) || 10));

  const [
    headerRows,
    perMetodeRows,
    perKasirRows,
    harianRows,
    bulananRows,
    detailAggRows,
    produkRows,
    stokMenipis,
  ] = await Promise.all([
    Penjualan.findAll({
      where: range,
      attributes: [
        [literal('COUNT(`t_penjualan`.`ID`)'), 'total_transaksi'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'bruto'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`PPN`, 0)), 0)'), 'ppn'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`SERVICE_CHARGE`, 0)), 0)'), 'service'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`DISKON`, 0)), 0)'), 'diskon'],
        [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`DISKON_VOUCHER`, 0)), 0)'), 'voucher'],
      ],
      raw: true,
    }),
    Penjualan.findAll({
      where: range,
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
      where: range,
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
    DetailPenjualan.findAll({
      attributes: [[literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`HARGA_BELI`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'modal']],
      include: [{ model: Penjualan, as: 'penjualan', attributes: [], where: range, required: true }],
      raw: true,
    }),
    DetailPenjualan.findAll({
      attributes: [
        'ID_PRODUK',
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'qty'],
        [literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`HARGA_JUAL`, 0) * COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'omzet'],
      ],
      include: [
        { model: Penjualan, as: 'penjualan', attributes: [], where: range, required: true },
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
  const bruto = Number(header.bruto) || 0;
  const ppn = Number(header.ppn) || 0;
  const service = Number(header.service) || 0;
  const diskon = Number(header.diskon) || 0;
  const voucher = Number(header.voucher) || 0;
  const modal = Number((detailAggRows[0] || {}).modal) || 0;
  const omzet = bruto - ppn - service;

  return {
    filter: { tanggal_awal, tanggal_akhir, status, stok_threshold: LOW_STOCK_THRESHOLD },
    ringkasan: {
      omzet_bersih: omzet,
      penerimaan_bruto: bruto,
      total_transaksi: Number(header.total_transaksi) || 0,
      total_modal: modal,
      laba_kotor: omzet - modal,
      ppn,
      service_charge: service,
      diskon,
      voucher,
      diskon_voucher_total: diskon + voucher,
    },
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
    produk_terlaris: produkRows.map((row) => ({
      id_produk: row.ID_PRODUK,
      nama: row.produk?.NAMA || `Produk #${row.ID_PRODUK}`,
      qty: Number(row.qty) || 0,
      omzet: Number(row.omzet) || 0,
    })),
    produk_stok_menipis: stokMenipis.map((p) => ({
      id: p.ID, nama: p.NAMA, stok: p.STOK, harga_jual: p.HARGA_JUAL,
    })),
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
