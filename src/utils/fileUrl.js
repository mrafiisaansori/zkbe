const fs = require('fs');
const path = require('path');

// Bangun base URL dari request (mendukung proxy via x-forwarded-*).
function buildBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// Tambahkan FOTO_URL absolut pada objek produk (mengembalikan plain object).
function withFotoUrl(produk, req) {
  if (!produk) return produk;
  const obj = typeof produk.toJSON === 'function' ? produk.toJSON() : { ...produk };
  obj.FOTO_URL = obj.FOTO ? `${buildBaseUrl(req)}/${String(obj.FOTO).replace(/^\/+/, '')}` : null;
  return obj;
}

function withFotoUrlList(list, req) {
  return (list || []).map((p) => withFotoUrl(p, req));
}

// Hapus file gambar lama (aman: hanya di folder uploads/products).
function deleteProductImage(fotoPath) {
  if (!fotoPath) return;
  if (!String(fotoPath).startsWith('uploads/products/')) return; // jangan sentuh path CI lama
  const full = path.join(__dirname, '../../', fotoPath);
  fs.promises.unlink(full).catch(() => {});
}

// Tambahkan IMAGE_URL absolut pada objek QRIS (mengembalikan plain object).
function withQrisImageUrl(qris, req) {
  if (!qris) return qris;
  const obj = typeof qris.toJSON === 'function' ? qris.toJSON() : { ...qris };
  obj.IMAGE_URL = obj.IMAGE ? `${buildBaseUrl(req)}/${String(obj.IMAGE).replace(/^\/+/, '')}` : null;
  return obj;
}

// Hapus file gambar QRIS lama (aman: hanya di folder uploads/qris).
function deleteQrisImage(imagePath) {
  if (!imagePath) return;
  if (!String(imagePath).startsWith('uploads/qris/')) return;
  const full = path.join(__dirname, '../../', imagePath);
  fs.promises.unlink(full).catch(() => {});
}

// Generik: tambahkan <FIELD>_URL absolut untuk path relatif uploads/...
function withImageUrl(row, field, req) {
  if (!row) return row;
  const obj = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  const val = obj[field];
  obj[`${field}_URL`] = val ? `${buildBaseUrl(req)}/${String(val).replace(/^\/+/, '')}` : null;
  return obj;
}

module.exports = {
  buildBaseUrl, withFotoUrl, withFotoUrlList, deleteProductImage,
  withQrisImageUrl, deleteQrisImage, withImageUrl,
};
