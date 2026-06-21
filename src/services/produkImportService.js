const { sequelize, Produk, Kategori, RekamStok } = require('../models');
const ApiError = require('../utils/ApiError');

// Lazy-load agar server tetap boot meski dependency belum di-install.
// Jalankan: npm install (xlsx sudah ada di package.json).
function getXLSX() {
  try { return require('xlsx'); }
  catch (_) { throw new ApiError(500, 'Modul "xlsx" belum terpasang. Jalankan: npm install'); }
}
const { activeMerchantId, getTenant } = require('../utils/tenancy');
const { currentPlan, FREE_MAX_PRODUK } = require('../utils/plan');

// Kolom template & sinonim header (case-insensitive).
const FIELDS = {
  nama: ['nama produk', 'nama', 'name', 'produk'],
  barcode: ['sku/barcode', 'sku', 'barcode', 'kode', 'kode produk'],
  kategori: ['kategori', 'category'],
  harga_jual: ['harga jual', 'harga_jual', 'harga', 'price'],
  harga_beli: ['harga modal', 'harga beli', 'harga_beli', 'modal', 'cost'],
  stok: ['stok awal', 'stok', 'stock', 'qty', 'kuantitas'],
};

// Bangun template Excel (buffer) untuk diunduh merchant.
function buildTemplate() {
  const XLSX = getXLSX();
  const header = ['Nama Produk', 'SKU/Barcode', 'Kategori', 'Harga Jual', 'Harga Modal', 'Stok Awal'];
  const example = ['Kopi Susu', '8990001234', 'Minuman', 18000, 9000, 50];
  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  ws['!cols'] = header.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produk');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Ambil nilai sebuah field dari baris (objek hasil sheet_to_json) berdasarkan sinonim.
function pick(rowLower, field) {
  for (const key of FIELDS[field]) {
    if (rowLower[key] !== undefined && rowLower[key] !== null && String(rowLower[key]).trim() !== '') {
      return rowLower[key];
    }
  }
  return undefined;
}

// Parse file Excel/CSV (buffer) -> array baris ternormalisasi.
function parseRows(buffer) {
  const XLSX = getXLSX();
  let wb;
  try { wb = XLSX.read(buffer, { type: 'buffer' }); }
  catch (_) { throw new ApiError(422, 'File tidak dapat dibaca. Pastikan format .xlsx atau .csv yang benar.'); }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return json.map((raw, idx) => {
    const lower = {};
    Object.keys(raw).forEach((k) => { lower[String(k).trim().toLowerCase()] = raw[k]; });
    return {
      _row: idx + 2, // +1 header +1 (1-based)
      nama: String(pick(lower, 'nama') ?? '').trim(),
      barcode: String(pick(lower, 'barcode') ?? '').trim(),
      kategori: String(pick(lower, 'kategori') ?? '').trim(),
      harga_jual: Number(pick(lower, 'harga_jual')) || 0,
      harga_beli: Number(pick(lower, 'harga_beli')) || 0,
      stok: Number(pick(lower, 'stok')) || 0,
    };
  });
}

// Validasi 1 baris (tanpa simpan).
function validateRow(r) {
  if (!r.nama) return 'Nama produk wajib diisi';
  if (!(r.harga_jual >= 0) || Number.isNaN(r.harga_jual)) return 'Harga jual tidak valid';
  if (r.harga_beli < 0) return 'Harga modal tidak valid';
  if (r.stok < 0) return 'Stok awal tidak valid';
  return null;
}

/**
 * Proses import. dryRun=true hanya validasi (preview), tidak menyimpan.
 * Mengembalikan { total, sukses, gagal, rows: [{row, nama, status, message}] }.
 */
async function importProducts(buffer, { dryRun = false } = {}) {
  const rows = parseRows(buffer);
  if (rows.length === 0) throw new ApiError(422, 'File kosong atau tidak ada data produk.');

  const plan = await currentPlan();
  const existing = await Produk.count();
  const sisaSlotFree = plan === 'FREE' ? Math.max(0, FREE_MAX_PRODUK - existing) : Infinity;

  const report = [];
  let willInsert = 0;
  // Tandai status tiap baris (validasi + limit FREE).
  for (const r of rows) {
    const err = validateRow(r);
    if (err) { report.push({ row: r._row, nama: r.nama, status: 'gagal', message: err }); continue; }
    if (willInsert >= sisaSlotFree) {
      report.push({ row: r._row, nama: r.nama, status: 'gagal', message: `Limit produk plan FREE maksimal ${FREE_MAX_PRODUK}. Upgrade ke PRO.` });
      continue;
    }
    willInsert += 1;
    report.push({ row: r._row, nama: r.nama, status: dryRun ? 'siap' : 'sukses', message: dryRun ? 'Siap diimport' : 'Berhasil' });
  }

  const summary = {
    total: rows.length,
    sukses: report.filter((x) => x.status === 'sukses' || x.status === 'siap').length,
    gagal: report.filter((x) => x.status === 'gagal').length,
  };
  if (dryRun) return { ...summary, rows: report };

  // ===== Eksekusi import (atomik) =====
  const merchantId = activeMerchantId();
  const { userId } = getTenant();
  const katCache = new Map(); // nama(lower) -> id

  await sequelize.transaction(async (t) => {
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const rep = report[i];
      if (rep.status !== 'sukses') continue; // lewati yang gagal
      if (plan === 'FREE' && inserted >= sisaSlotFree) { rep.status = 'gagal'; rep.message = 'Limit FREE tercapai'; continue; }

      // Resolusi/auto-create kategori (per merchant).
      let idKategori = null;
      if (r.kategori) {
        const keyK = r.kategori.toLowerCase();
        if (katCache.has(keyK)) idKategori = katCache.get(keyK);
        else {
          let kat = await Kategori.findOne({ where: { DESKRIPSI: r.kategori }, transaction: t });
          if (!kat) {
            kat = await Kategori.create({
              DESKRIPSI: r.kategori,
              ...(merchantId !== undefined ? { MERCHANT_ID: merchantId } : {}),
            }, { transaction: t });
          }
          idKategori = kat.ID; katCache.set(keyK, kat.ID);
        }
      }

      const produk = await Produk.create({
        NAMA: r.nama,
        ID_KATEGORI: idKategori,
        STOK: r.stok,
        HARGA_BELI: r.harga_beli,
        HARGA_JUAL: r.harga_jual,
        BARCODE: r.barcode || null,
        ...(merchantId !== undefined ? { MERCHANT_ID: merchantId } : {}),
      }, { transaction: t });

      if (!produk.BARCODE) {
        const mid = String(merchantId || 0).padStart(4, '0').slice(-4);
        const pid = String(produk.ID).padStart(8, '0').slice(-8);
        await produk.update({ BARCODE: `2${mid}${pid}` }, { transaction: t });
      }

      if (r.stok > 0) {
        await RekamStok.create({
          ID_PRODUK: produk.ID, JENIS: 1, QTY: r.stok, TANGGAL: new Date(),
          KETERANGAN: 'Stok Awal (Import Excel)', ID_USER: userId ?? null,
          ...(merchantId !== undefined ? { MERCHANT_ID: merchantId } : {}),
        }, { transaction: t });
      }
      inserted += 1;
    }
  });

  summary.sukses = report.filter((x) => x.status === 'sukses').length;
  summary.gagal = report.filter((x) => x.status === 'gagal').length;
  return { ...summary, rows: report };
}

module.exports = { buildTemplate, importProducts };
