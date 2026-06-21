const { Op, fn, col, literal } = require('sequelize');
const {
  Penjualan, DetailPenjualan, Produk, Pengguna, JenisBayar, Penyusutan,
} = require('../models');

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

module.exports = { penjualan, pendapatan, stok, penyusutan };
