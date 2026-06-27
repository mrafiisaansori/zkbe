const { Op } = require('sequelize');
const {
  sequelize, Retur, DetailRetur, Produk, Supplier, Pengguna, Pembelian, DetailPembelian, RekamStok,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { parsePagination, paginated } = require('../utils/pagination');

// STATUS: 0=DRAFT, 1=SELESAI, 2=DIBATALKAN
const STATUS = { DRAFT: 0, SELESAI: 1, DIBATALKAN: 2 };

const includeHeader = [
  { model: Pengguna, as: 'user', attributes: ['ID', 'NAMA'] },
  { model: Supplier, as: 'supplier', attributes: ['ID', 'NAMA'] },
  { model: Pembelian, as: 'pembelian', attributes: ['ID', 'NO_NOTA'] },
];
const LIST_ATTRIBUTES = ['ID', 'NO_NOTA', 'TANGGAL', 'ID_USER', 'ID_SUPPLIER', 'ID_PEMBELIAN', 'STATUS', 'CATATAN'];

async function list({ status, tanggal_awal, tanggal_akhir, search, page, limit } = {}) {
  const where = {};
  if (status !== undefined && status !== '' && status !== null) where.STATUS = Number(status);
  if (tanggal_awal && tanggal_akhir) where.TANGGAL = { [Op.between]: [tanggal_awal, tanggal_akhir] };
  if (search) where.NO_NOTA = { [Op.like]: `%${search}%` };

  const pagination = parsePagination({ page, limit });
  const query = { where, attributes: LIST_ATTRIBUTES, include: includeHeader, order: [['ID', 'DESC']] };
  if (!pagination) return Retur.findAll(query);
  const result = await Retur.findAndCountAll({
    ...query,
    distinct: true,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginated(result.rows, result.count, pagination);
}

async function getById(id) {
  const r = await Retur.findByPk(id, {
    include: [
      ...includeHeader,
      {
        model: DetailRetur, as: 'detail',
        include: [{ model: Produk, as: 'produk', attributes: ['ID', 'NAMA', 'STOK'] }],
      },
    ],
  });
  if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
  return r;
}

/**
 * Validasi item retur. TIDAK mengubah stok (hanya saat finalisasi).
 * Bila ada pembelian asal, qty retur per produk tidak boleh > qty dibeli.
 */
async function resolveItems(items, idPembelian, t) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Item retur tidak boleh kosong');
  }

  // Peta qty pembelian asal per produk (bila dipilih).
  let purchasedMap = null;
  if (idPembelian) {
    const beli = await Pembelian.findByPk(idPembelian, { transaction: t });
    if (!beli) throw new ApiError(404, 'Pembelian asal tidak ditemukan');
    const dets = await DetailPembelian.findAll({ where: { ID_TRANSAKSI_PEMBELIAN: idPembelian }, transaction: t });
    purchasedMap = {};
    dets.forEach((d) => { purchasedMap[d.ID_PRODUK] = (purchasedMap[d.ID_PRODUK] || 0) + Number(d.QTY); });
  }

  const rows = [];
  for (const it of items) {
    const produk = await Produk.findByPk(it.id_produk, { transaction: t });
    if (!produk) throw new ApiError(404, `Produk ID ${it.id_produk} tidak ditemukan`);
    const qty = Number(it.qty);
    if (!(qty > 0)) throw new ApiError(400, `Jumlah retur tidak valid untuk produk ${produk.NAMA}`);
    if (purchasedMap && qty > (purchasedMap[produk.ID] || 0)) {
      throw new ApiError(400, `Qty retur "${produk.NAMA}" melebihi qty pembelian asal (maks ${purchasedMap[produk.ID] || 0}).`);
    }
    rows.push({
      id_produk: produk.ID,
      qty,
      stok_lama: produk.STOK,
      alasan: it.alasan || null,
      kondisi: it.kondisi || null,
      harga: it.harga != null ? Number(it.harga) : null,
      keterangan: it.keterangan || null,
    });
  }
  return rows;
}

// Buat dokumen retur DRAFT (header + items). Stok BELUM berubah. user dari token.
async function create(data, userId) {
  return sequelize.transaction(async (t) => {
    const rows = await resolveItems(data.items, data.id_pembelian, t);
    const header = await Retur.create({
      NO_NOTA: data.no_nota,
      TANGGAL: data.tanggal,
      ID_USER: userId ?? null,
      ID_SUPPLIER: data.id_supplier ?? null,
      ID_PEMBELIAN: data.id_pembelian ?? null,
      CATATAN: data.catatan ?? null,
      STATUS: STATUS.DRAFT,
    }, { transaction: t });

    for (const r of rows) {
      await DetailRetur.create({
        ID_TRANSAKSI_RETUR: header.ID,
        ID_PRODUK: r.id_produk,
        QTY: r.qty,
        QTY_LAMA: r.stok_lama,
        ID_SUPPLIER: data.id_supplier ?? null,
        ALASAN: r.alasan,
        KONDISI: r.kondisi,
        HARGA: r.harga,
        KETERANGAN: r.keterangan,
      }, { transaction: t });
    }
    return { id: header.ID };
  });
}

// Ubah dokumen DRAFT (ganti header + item). Hanya saat DRAFT, tanpa efek stok.
async function update(id, data) {
  return sequelize.transaction(async (t) => {
    const r = await Retur.findByPk(id, { transaction: t });
    if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
    if (r.STATUS !== STATUS.DRAFT) throw new ApiError(400, 'Retur sudah final, tidak bisa diubah.');

    const rows = await resolveItems(data.items, data.id_pembelian ?? r.ID_PEMBELIAN, t);
    await r.update({
      NO_NOTA: data.no_nota ?? r.NO_NOTA,
      TANGGAL: data.tanggal ?? r.TANGGAL,
      ID_SUPPLIER: data.id_supplier ?? r.ID_SUPPLIER,
      ID_PEMBELIAN: data.id_pembelian ?? r.ID_PEMBELIAN,
      CATATAN: data.catatan ?? r.CATATAN,
    }, { transaction: t });

    await DetailRetur.destroy({ where: { ID_TRANSAKSI_RETUR: id }, transaction: t });
    for (const row of rows) {
      await DetailRetur.create({
        ID_TRANSAKSI_RETUR: id,
        ID_PRODUK: row.id_produk,
        QTY: row.qty,
        QTY_LAMA: row.stok_lama,
        ID_SUPPLIER: data.id_supplier ?? r.ID_SUPPLIER,
        ALASAN: row.alasan,
        KONDISI: row.kondisi,
        HARGA: row.harga,
        KETERANGAN: row.keterangan,
      }, { transaction: t });
    }
    return { id };
  });
}

// Hapus dokumen — hanya DRAFT (dokumen SELESAI tidak boleh hard delete).
async function remove(id) {
  return sequelize.transaction(async (t) => {
    const r = await Retur.findByPk(id, { transaction: t });
    if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
    if (r.STATUS !== STATUS.DRAFT) throw new ApiError(400, 'Retur sudah final, tidak bisa dihapus. Gunakan Batalkan/Void.');
    await DetailRetur.destroy({ where: { ID_TRANSAKSI_RETUR: id }, transaction: t });
    await r.destroy({ transaction: t });
    return true;
  });
}

/**
 * Selesaikan retur (atomik): validasi stok cukup, KURANGI stok, catat rekam stok
 * keluar (Retur Pembelian), kunci STATUS=SELESAI.
 */
async function selesaikan(id, userId) {
  return sequelize.transaction(async (t) => {
    const r = await Retur.findByPk(id, { transaction: t });
    if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
    if (r.STATUS !== STATUS.DRAFT) throw new ApiError(400, 'Hanya retur DRAFT yang bisa diselesaikan.');
    const details = await DetailRetur.findAll({ where: { ID_TRANSAKSI_RETUR: id }, transaction: t });
    if (!details.length) throw new ApiError(400, 'Retur tidak memiliki item.');

    // Validasi stok cukup lebih dulu (semua item) agar tidak setengah jalan.
    for (const d of details) {
      const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
      if (!produk) throw new ApiError(404, `Produk ID ${d.ID_PRODUK} tidak ditemukan`);
      if (Number(d.QTY) > Number(produk.STOK)) {
        throw new ApiError(400, `Stok "${produk.NAMA}" tidak mencukupi untuk retur (tersedia ${produk.STOK}).`);
      }
    }
    // Kurangi stok + rekam.
    for (const d of details) {
      const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
      await RekamStok.create({
        ID_PRODUK: d.ID_PRODUK, JENIS: 2, QTY: d.QTY, TANGGAL: new Date(),
        KETERANGAN: `Retur Pembelian - nota ${r.NO_NOTA}`,
        ID_USER: userId ?? null,
      }, { transaction: t });
      await produk.update({ STOK: Number(produk.STOK) - Number(d.QTY) }, { transaction: t });
    }
    await r.update({ STATUS: STATUS.SELESAI }, { transaction: t });
    return { id, status: STATUS.SELESAI };
  });
}

/**
 * Batalkan/Void retur.
 * - DRAFT: cukup tandai DIBATALKAN (stok belum pernah berubah).
 * - SELESAI: KEMBALIKAN stok (rekam stok masuk) lalu tandai DIBATALKAN.
 * Tidak pernah hard delete dokumen final.
 */
async function cancel(id, userId) {
  return sequelize.transaction(async (t) => {
    const r = await Retur.findByPk(id, { transaction: t });
    if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
    if (r.STATUS === STATUS.DIBATALKAN) throw new ApiError(400, 'Retur sudah dibatalkan.');

    if (r.STATUS === STATUS.SELESAI) {
      const details = await DetailRetur.findAll({ where: { ID_TRANSAKSI_RETUR: id }, transaction: t });
      for (const d of details) {
        const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
        if (!produk) continue;
        await RekamStok.create({
          ID_PRODUK: d.ID_PRODUK, JENIS: 1, QTY: d.QTY, TANGGAL: new Date(),
          KETERANGAN: `Pembatalan Retur - nota ${r.NO_NOTA}`,
          ID_USER: userId ?? null,
        }, { transaction: t });
        await produk.update({ STOK: Number(produk.STOK) + Number(d.QTY) }, { transaction: t });
      }
    }
    await r.update({ STATUS: STATUS.DIBATALKAN }, { transaction: t });
    return { id, status: STATUS.DIBATALKAN };
  });
}

module.exports = { list, getById, create, update, remove, selesaikan, cancel, STATUS };
