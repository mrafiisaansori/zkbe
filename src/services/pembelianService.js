const {
  sequelize, Pembelian, DetailPembelian, Produk, Supplier, Pengguna, RekamStok,
} = require('../models');
const ApiError = require('../utils/ApiError');

const includeHeader = [{ model: Pengguna, as: 'user', attributes: ['ID', 'NAMA'] }];

const list = () => Pembelian.findAll({ include: includeHeader, order: [['ID', 'DESC']] });

async function getById(id) {
  const p = await Pembelian.findByPk(id, {
    include: [
      ...includeHeader,
      {
        model: DetailPembelian, as: 'detail',
        include: [
          { model: Produk, as: 'produk', attributes: ['ID', 'NAMA'] },
          { model: Supplier, as: 'supplier', attributes: ['ID', 'NAMA'] },
        ],
      },
    ],
  });
  if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
  return p;
}

// Buat header pembelian (status draft = 0). Mengikuti insertPembelian().
const create = (data) => Pembelian.create({
  NO_NOTA: data.no_nota,
  TANGGAL: data.tanggal,
  ID_USER: data.id_user,
  STATUS: 0,
});

async function update(id, data) {
  const p = await Pembelian.findByPk(id);
  if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
  if (p.STATUS === 1) throw new ApiError(400, 'Pembelian sudah selesai, tidak bisa diubah');
  await p.update({ NO_NOTA: data.no_nota ?? p.NO_NOTA, TANGGAL: data.tanggal ?? p.TANGGAL });
  return p;
}

// Hapus pembelian + detailnya (hanya jika belum selesai).
async function remove(id) {
  return sequelize.transaction(async (t) => {
    const p = await Pembelian.findByPk(id, { transaction: t });
    if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
    if (p.STATUS === 1) throw new ApiError(400, 'Pembelian sudah selesai, tidak bisa dihapus');
    await DetailPembelian.destroy({ where: { ID_TRANSAKSI_PEMBELIAN: id }, transaction: t });
    await p.destroy({ transaction: t });
    return true;
  });
}

// Tambah item ke pembelian. QTY_LAMA menyimpan stok produk saat input (mengikuti CI).
async function addDetail(id, data) {
  const p = await Pembelian.findByPk(id);
  if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
  if (p.STATUS === 1) throw new ApiError(400, 'Pembelian sudah selesai');
  const produk = await Produk.findByPk(data.id_produk);
  if (!produk) throw new ApiError(404, 'Produk tidak ditemukan');
  return DetailPembelian.create({
    ID_TRANSAKSI_PEMBELIAN: id,
    ID_PRODUK: data.id_produk,
    HARGA_BELI: data.harga_beli,
    QTY: data.qty,
    QTY_LAMA: produk.STOK,
    ID_SUPPLIER: data.id_supplier,
  });
}

async function removeDetail(id, idDetail) {
  const d = await DetailPembelian.findOne({ where: { ID: idDetail, ID_TRANSAKSI_PEMBELIAN: id } });
  if (!d) throw new ApiError(404, 'Detail pembelian tidak ditemukan');
  await d.destroy();
  return true;
}

/**
 * Selesaikan pembelian - meniru selesaikanPembelian() di CI:
 * - Untuk tiap detail: catat rekam stok (JENIS=1 restok), tambah STOK & update HARGA_BELI produk.
 * - Set STATUS pembelian = 1.
 */
async function selesaikan(id) {
  return sequelize.transaction(async (t) => {
    const p = await Pembelian.findByPk(id, { transaction: t });
    if (!p) throw new ApiError(404, 'Pembelian tidak ditemukan');
    if (p.STATUS === 1) throw new ApiError(400, 'Pembelian sudah selesai');
    const details = await DetailPembelian.findAll({ where: { ID_TRANSAKSI_PEMBELIAN: id }, transaction: t });
    if (!details.length) throw new ApiError(400, 'Pembelian tidak memiliki detail item');

    for (const d of details) {
      const produk = await Produk.findByPk(d.ID_PRODUK, { transaction: t });
      if (!produk) continue;
      await RekamStok.create({
        ID_PRODUK: d.ID_PRODUK, JENIS: 1, QTY: d.QTY, TANGGAL: new Date(),
        KETERANGAN: `Pembelian barang dengan no nota : ${p.NO_NOTA}`,
      }, { transaction: t });
      await produk.update({ STOK: produk.STOK + d.QTY, HARGA_BELI: d.HARGA_BELI }, { transaction: t });
    }
    await p.update({ STATUS: 1 }, { transaction: t });
    return { id, status: 1 };
  });
}

module.exports = { list, getById, create, update, remove, addDetail, removeDetail, selesaikan };
