const { Op } = require('sequelize');
const {
  sequelize, Pembelian, DetailPembelian, Produk, Supplier, Pengguna, RekamStok,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, paginated } = require('../utils/pagination');

// STATUS: 0=DRAFT, 1=SELESAI, 2=CANCELLED
const STATUS = { DRAFT: 0, SELESAI: 1, CANCELLED: 2 };

const includeHeader = [
  { model: Pengguna, as: 'user', attributes: ['ID', 'NAMA'] },
  { model: Supplier, as: 'supplier', attributes: ['ID', 'NAMA'] },
];
const LIST_ATTRIBUTES = ['ID', 'NO_NOTA', 'TANGGAL', 'ID_USER', 'ID_SUPPLIER', 'STATUS', 'CATATAN'];

// Daftar pembelian + filter status/tanggal/cari nomor nota. Scoped merchant via hook.
async function list({ status, tanggal_awal, tanggal_akhir, search, page, limit } = {}) {
  const where = {};
  if (status !== undefined && status !== '' && status !== null) where.STATUS = Number(status);
  if (tanggal_awal && tanggal_akhir) where.TANGGAL = { [Op.between]: [tanggal_awal, tanggal_akhir] };
  if (search) where.NO_NOTA = { [Op.like]: `%${search}%` };

  const pagination = parsePagination({ page, limit });
  const query = { where, attributes: LIST_ATTRIBUTES, include: includeHeader, order: [['ID', 'DESC']] };
  if (!pagination) return Pembelian.findAll(query);
  const result = await Pembelian.findAndCountAll({
    ...query,
    distinct: true,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginated(result.rows, result.count, pagination);
}

async function getById(id) {
  const p = await Pembelian.findByPk(id, {
    include: [
      ...includeHeader,
      {
        model: DetailPembelian, as: 'detail',
        include: [{ model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] }],
      },
    ],
  });
  if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
  return p;
}

// Validasi & normalisasi item. Subtotal dihitung server (tidak percaya frontend).
async function resolveItems(items, t) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Item pembelian tidak boleh kosong');
  }
  const rows = [];
  let total = 0;
  for (const it of items) {
    const produk = await Produk.findByPk(it.id_produk, { transaction: t });
    if (!produk) throw new ApiError(404, `Produk ID ${it.id_produk} tidak ditemukan`);
    const qty = Number(it.qty);
    const harga = Number(it.harga_beli);
    if (!(qty > 0)) throw new ApiError(400, `Jumlah tidak valid untuk produk ${produk.NAMA}`);
    if (!(harga >= 0)) throw new ApiError(400, `Harga beli tidak valid untuk produk ${produk.NAMA}`);
    rows.push({ id_produk: produk.ID, harga_beli: harga, qty, stok_lama: produk.STOK });
    total += harga * qty;
  }
  return { rows, total };
}

/**
 * Buat dokumen pembelian DRAFT (header + items) dalam 1 transaksi.
 * id_user diambil dari token (controller), bukan frontend.
 */
async function create(data, userId) {
  return sequelize.transaction(async (t) => {
    const { rows } = await resolveItems(data.items, t);
    const header = await Pembelian.create({
      NO_NOTA: data.no_nota,
      TANGGAL: data.tanggal,
      ID_USER: userId ?? null,
      ID_SUPPLIER: data.id_supplier ?? null,
      CATATAN: data.catatan ?? null,
      STATUS: STATUS.DRAFT,
    }, { transaction: t });

    for (const r of rows) {
      await DetailPembelian.create({
        ID_TRANSAKSI_PEMBELIAN: header.ID,
        ID_PRODUK: r.id_produk,
        HARGA_BELI: r.harga_beli,
        QTY: r.qty,
        QTY_LAMA: r.stok_lama,
        ID_SUPPLIER: data.id_supplier ?? null,
      }, { transaction: t });
    }
    return { id: header.ID };
  });
}

/**
 * Ubah dokumen DRAFT (ganti header + ganti semua item). Hanya saat DRAFT.
 */
async function update(id, data) {
  return sequelize.transaction(async (t) => {
    const p = await Pembelian.findByPk(id, { transaction: t });
    if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
    if (p.STATUS !== STATUS.DRAFT) throw new ApiError(400, 'Pembelian sudah final, tidak bisa diubah.');

    const { rows } = await resolveItems(data.items, t);
    await p.update({
      NO_NOTA: data.no_nota ?? p.NO_NOTA,
      TANGGAL: data.tanggal ?? p.TANGGAL,
      ID_SUPPLIER: data.id_supplier ?? p.ID_SUPPLIER,
      CATATAN: data.catatan ?? p.CATATAN,
    }, { transaction: t });

    await DetailPembelian.destroy({ where: { ID_TRANSAKSI_PEMBELIAN: id }, transaction: t });
    for (const r of rows) {
      await DetailPembelian.create({
        ID_TRANSAKSI_PEMBELIAN: id,
        ID_PRODUK: r.id_produk,
        HARGA_BELI: r.harga_beli,
        QTY: r.qty,
        QTY_LAMA: r.stok_lama,
        ID_SUPPLIER: data.id_supplier ?? p.ID_SUPPLIER,
      }, { transaction: t });
    }
    return { id };
  });
}

// Hapus dokumen — hanya DRAFT (dokumen SELESAI tidak boleh dihapus via API).
async function remove(id) {
  return sequelize.transaction(async (t) => {
    const p = await Pembelian.findByPk(id, { transaction: t });
    if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
    if (p.STATUS === STATUS.SELESAI) throw new ApiError(400, 'Pembelian sudah selesai, tidak bisa dihapus.');
    await DetailPembelian.destroy({ where: { ID_TRANSAKSI_PEMBELIAN: id }, transaction: t });
    await p.destroy({ transaction: t });
    return true;
  });
}

/**
 * Selesaikan pembelian (atomik): tambah stok, catat rekam stok (Pembelian Barang),
 * update harga beli produk (harga terakhir), kunci STATUS=SELESAI.
 */
async function selesaikan(id, userId) {
  return sequelize.transaction(async (t) => {
    const p = await Pembelian.findByPk(id, { transaction: t });
    if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
    if (p.STATUS !== STATUS.DRAFT) throw new ApiError(400, 'Hanya pembelian DRAFT yang bisa diselesaikan.');
    const details = await DetailPembelian.findAll({ where: { ID_TRANSAKSI_PEMBELIAN: id }, transaction: t });
    if (!details.length) throw new ApiError(400, 'Pembelian tidak memiliki item.');

    for (const d of details) {
      const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
      if (!produk) continue;
      await RekamStok.create({
        ID_PRODUK: d.ID_PRODUK, JENIS: 1, QTY: d.QTY, TANGGAL: new Date(),
        KETERANGAN: `Pembelian Barang - nota ${p.NO_NOTA}`,
        ID_USER: userId ?? null,
      }, { transaction: t });
      await produk.update(
        { STOK: Number(produk.STOK) + Number(d.QTY), HARGA_BELI: d.HARGA_BELI },
        { transaction: t },
      );
    }
    await p.update({ STATUS: STATUS.SELESAI }, { transaction: t });
    return { id, status: STATUS.SELESAI };
  });
}

// Batalkan dokumen DRAFT (tanpa efek stok). Dokumen SELESAI tidak bisa dibatalkan.
async function cancel(id) {
  const p = await Pembelian.findByPk(id);
  if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
  if (p.STATUS === STATUS.SELESAI) throw new ApiError(400, 'Pembelian sudah selesai, tidak bisa dibatalkan.');
  await p.update({ STATUS: STATUS.CANCELLED });
  return { id, status: STATUS.CANCELLED };
}

module.exports = { list, getById, create, update, remove, selesaikan, cancel, STATUS };
