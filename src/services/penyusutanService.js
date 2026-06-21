const { sequelize, Penyusutan, Produk } = require('../models');
const ApiError = require('../utils/ApiError');

// Penyusutan harga jual produk - meniru Urgent::dopenyusutan().
async function listByProduk(idProduk) {
  return Penyusutan.findAll({ where: { ID_PRODUK: idProduk }, order: [['ID', 'DESC']] });
}

async function create(idProduk, { harga_jual_awal, prosentase, harga_jual_akhir }) {
  return sequelize.transaction(async (t) => {
    const produk = await Produk.findByPk(idProduk, { transaction: t });
    if (!produk) throw new ApiError(404, 'Produk tidak ditemukan');
    const row = await Penyusutan.create({
      ID_PRODUK: idProduk,
      HARGA_JUAL_AWAL: harga_jual_awal ?? produk.HARGA_JUAL,
      HARGA_JUAL_AKHIR: harga_jual_akhir,
      PROSENTASE_PENYUSUTAN: prosentase,
      TANGGAL: new Date(),
    }, { transaction: t });
    await produk.update({ HARGA_JUAL: harga_jual_akhir }, { transaction: t });
    return row;
  });
}

// Hapus penyusutan -> kembalikan harga jual ke HARGA_JUAL_AWAL.
async function remove(id) {
  return sequelize.transaction(async (t) => {
    const row = await Penyusutan.findByPk(id, { transaction: t });
    if (!row) throw new ApiError(404, 'Data penyusutan tidak ditemukan');
    const produk = await Produk.findByPk(row.ID_PRODUK, { transaction: t });
    if (produk) await produk.update({ HARGA_JUAL: row.HARGA_JUAL_AWAL }, { transaction: t });
    await row.destroy({ transaction: t });
    return true;
  });
}

module.exports = { listByProduk, create, remove };
