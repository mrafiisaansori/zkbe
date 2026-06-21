const {
  sequelize, Retur, DetailRetur, Produk, Supplier, Pengguna, RekamStok,
} = require('../models');
const ApiError = require('../utils/ApiError');

const includeHeader = [{ model: Pengguna, as: 'user', attributes: ['ID', 'NAMA'] }];

const list = () => Retur.findAll({ include: includeHeader, order: [['ID', 'DESC']] });

async function getById(id) {
  const r = await Retur.findByPk(id, {
    include: [
      ...includeHeader,
      {
        model: DetailRetur, as: 'detail',
        include: [
          { model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] },
          { model: Supplier, as: 'supplier', attributes: ['ID', 'NAMA'] },
        ],
      },
    ],
  });
  if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
  return r;
}

const create = (data) => Retur.create({
  NO_NOTA: data.no_nota, TANGGAL: data.tanggal, ID_USER: data.id_user, STATUS: 0,
});

async function update(id, data) {
  const r = await Retur.findByPk(id);
  if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
  await r.update({ NO_NOTA: data.no_nota ?? r.NO_NOTA, TANGGAL: data.tanggal ?? r.TANGGAL });
  return r;
}

async function remove(id) {
  return sequelize.transaction(async (t) => {
    const r = await Retur.findByPk(id, { transaction: t });
    if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
    await DetailRetur.destroy({ where: { ID_TRANSAKSI_RETUR: id }, transaction: t });
    await r.destroy({ transaction: t });
    return true;
  });
}

/**
 * Tambah detail retur - meniru tambahDetailRetur() di CI:
 * - Validasi qty <= stok produk.
 * - Catat rekam stok JENIS=2 (keluar) dan kurangi stok produk.
 */
async function addDetail(id, data) {
  return sequelize.transaction(async (t) => {
    const r = await Retur.findByPk(id, { transaction: t });
    if (!r) throw new ApiError(404, 'Retur tidak ditemukan');
    const produk = await Produk.findByPk(data.id_produk, { transaction: t });
    if (!produk) throw new ApiError(404, 'Produk tidak ditemukan');
    if (data.qty > produk.STOK) throw new ApiError(400, 'Gagal retur: stok barang tidak mencukupi');

    const detail = await DetailRetur.create({
      ID_TRANSAKSI_RETUR: id,
      ID_PRODUK: data.id_produk,
      QTY: data.qty,
      QTY_LAMA: produk.STOK,
      ID_SUPPLIER: data.id_supplier,
      KETERANGAN: data.keterangan || null,
    }, { transaction: t });

    await RekamStok.create({
      ID_PRODUK: data.id_produk, JENIS: 2, QTY: data.qty, TANGGAL: new Date(),
      KETERANGAN: data.keterangan || 'Retur barang',
    }, { transaction: t });
    await produk.update({ STOK: produk.STOK - data.qty }, { transaction: t });
    return detail;
  });
}

/**
 * Hapus/batalkan detail retur - mengembalikan stok (JENIS=1 restok).
 */
async function removeDetail(id, idDetail) {
  return sequelize.transaction(async (t) => {
    const d = await DetailRetur.findOne({ where: { ID: idDetail, ID_TRANSAKSI_RETUR: id }, transaction: t });
    if (!d) throw new ApiError(404, 'Detail retur tidak ditemukan');
    const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
    if (produk) {
      await RekamStok.create({
        ID_PRODUK: d.ID_PRODUK, JENIS: 1, QTY: d.QTY, TANGGAL: new Date(),
        KETERANGAN: 'Pembatalan retur dari admin',
      }, { transaction: t });
      await produk.update({ STOK: produk.STOK + d.QTY }, { transaction: t });
    }
    await d.destroy({ transaction: t });
    return true;
  });
}

module.exports = { list, getById, create, update, remove, addDetail, removeDetail };
