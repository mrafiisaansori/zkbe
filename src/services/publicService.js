const { Op } = require('sequelize');
const {
  sequelize, Meja, Merchant, Identitas, Produk, Kategori, OpenBill, OpenBillDetail,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { effectivePlan, hasProFeatures } = require('../utils/plan');
const { buildBaseUrl } = require('../utils/fileUrl');
const env = require('../config/env');

// Fitur "pesan dari meja" (QR self-order) dimatikan sementara via feature flag.
function assertQrOrderEnabled() {
  if (!env.features.qrOrder) {
    throw new ApiError(503, 'Fitur pesan dari meja sedang dinonaktifkan sementara.');
  }
}

// CATATAN KEAMANAN: rute publik TANPA login. merchant_id SELALU diturunkan dari
// token QR / slug di server — TIDAK PERNAH dari body frontend. Semua query
// menyertakan MERCHANT_ID eksplisit (tanpa konteks tenant, hook tidak aktif).

function absUrl(path, req) {
  return path ? `${buildBaseUrl(req)}/${String(path).replace(/^\/+/, '')}` : null;
}

async function loadStoreData(merchantId, req) {
  const identitas = await Identitas.findOne({ where: { MERCHANT_ID: merchantId } });
  const produk = await Produk.findAll({
    where: { MERCHANT_ID: merchantId },
    include: [{ model: Kategori, as: 'kategori', attributes: ['ID', 'DESKRIPSI'] }],
    order: [['NAMA', 'ASC']],
  });
  const kategori = await Kategori.findAll({ where: { MERCHANT_ID: merchantId }, order: [['DESKRIPSI', 'ASC']] });
  return {
    toko: identitas ? {
      nama: identitas.NAMA, alamat: identitas.ALAMAT, no_telp: identitas.NO_TELP,
      logo_url: absUrl(identitas.LOGO, req), banner_url: absUrl(identitas.BANNER, req),
    } : null,
    kategori: kategori.map((k) => ({ id: k.ID, nama: k.DESKRIPSI })),
    produk: produk.map((p) => ({
      id: p.ID, nama: p.NAMA, harga: p.HARGA_JUAL, stok: p.STOK,
      id_kategori: p.ID_KATEGORI, kategori: p.kategori ? p.kategori.DESKRIPSI : null,
      foto_url: absUrl(p.FOTO, req),
    })),
  };
}

// ===== QR Menu (self order) =====
async function getMenu(token, req) {
  assertQrOrderEnabled();
  const meja = await Meja.findOne({ where: { QR_TOKEN: token, IS_ACTIVE: true } });
  if (!meja) throw new ApiError(404, 'Menu tidak ditemukan atau sudah nonaktif.');
  const merchant = await Merchant.findByPk(meja.MERCHANT_ID);
  if (!merchant || merchant.STATUS !== 'active') throw new ApiError(404, 'Toko tidak aktif.');
  if (!hasProFeatures(effectivePlan(merchant))) throw new ApiError(403, 'Menu digital tidak tersedia.');

  const store = await loadStoreData(merchant.ID, req);
  return { meja: { id: meja.ID, nomor: meja.NOMOR }, merchant: { id: merchant.ID, nama: merchant.NAMA }, ...store };
}

async function createOrder(token, { items, customer_name, note }, req) {
  assertQrOrderEnabled();
  const meja = await Meja.findOne({ where: { QR_TOKEN: token, IS_ACTIVE: true } });
  if (!meja) throw new ApiError(404, 'Menu tidak ditemukan.');
  const merchant = await Merchant.findByPk(meja.MERCHANT_ID);
  if (!merchant || merchant.STATUS !== 'active') throw new ApiError(404, 'Toko tidak aktif.');
  if (!hasProFeatures(effectivePlan(merchant))) throw new ApiError(403, 'Pemesanan tidak tersedia.');
  if (!items || !items.length) throw new ApiError(400, 'Pesanan kosong.');

  const merchantId = merchant.ID;

  return sequelize.transaction(async (t) => {
    let total = 0;
    const resolved = [];
    for (const it of items) {
      const produk = await Produk.findOne({ where: { ID: it.id_produk, MERCHANT_ID: merchantId }, transaction: t });
      if (!produk) throw new ApiError(404, `Produk tidak ditemukan`);
      const qty = Number(it.qty);
      if (!(qty > 0)) throw new ApiError(400, 'Jumlah tidak valid.');
      total += produk.HARGA_JUAL * qty;
      resolved.push({ produk, qty });
    }

    // Bill number unik per merchant.
    const code = merchant.INVOICE_PREFIX || 'TK';
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

    const bill = await OpenBill.create({
      NO_BILL: null,
      CUSTOMER_NAME: (customer_name || '').trim() || `Meja ${meja.NOMOR}`,
      TABLE_NO: meja.NOMOR,
      NOTE: (note || '').trim() || 'Pesanan dari QR Menu',
      STATUS: 'OPEN',
      TOTAL: total,
      ID_USER: null,
      MERCHANT_ID: merchantId, // eksplisit (tanpa konteks tenant)
    }, { transaction: t });

    await bill.update({ NO_BILL: `BILL-${code}-${ymd}-${String(bill.ID).padStart(4, '0')}` }, { transaction: t });

    for (const r of resolved) {
      await OpenBillDetail.create({
        ID_OPEN_BILL: bill.ID, ID_PRODUK: r.produk.ID,
        HARGA_BELI: r.produk.HARGA_BELI, HARGA_JUAL: r.produk.HARGA_JUAL,
        QTY: r.qty, MERCHANT_ID: merchantId,
      }, { transaction: t });
    }

    return { no_bill: bill.NO_BILL, meja: meja.NOMOR, total };
  });
}

// ===== Katalog publik (slug) =====
async function getCatalog(slug, req) {
  const merchant = await Merchant.findOne({ where: { SLUG: slug } });
  if (!merchant || merchant.STATUS !== 'active') throw new ApiError(404, 'Toko tidak ditemukan.');
  const store = await loadStoreData(merchant.ID, req);
  return {
    merchant: { id: merchant.ID, nama: merchant.NAMA, phone: merchant.PHONE, slug: merchant.SLUG },
    ...store,
  };
}

module.exports = { getMenu, createOrder, getCatalog };
