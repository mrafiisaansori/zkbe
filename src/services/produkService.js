const { Op } = require('sequelize');
const { sequelize, Produk, Kategori, RekamStok } = require('../models');
const ApiError = require('../utils/ApiError');
const { deleteProductImage } = require('../utils/fileUrl');
const { activeMerchantId, getTenant } = require('../utils/tenancy');
const { currentPlan, FREE_MAX_PRODUK } = require('../utils/plan');
const { parsePagination, paginated } = require('../utils/pagination');

const LIST_ATTRIBUTES = ['ID', 'NAMA', 'ID_KATEGORI', 'STOK', 'HARGA_BELI', 'HARGA_JUAL', 'BARCODE', 'FOTO'];

async function list({ search, category_id, page, limit } = {}) {
  const where = {};
  if (category_id && category_id !== 'all') where.ID_KATEGORI = Number(category_id);
  if (search) {
    where[Op.or] = [
      { NAMA: { [Op.like]: `%${search}%` } },
      { BARCODE: { [Op.like]: `%${search}%` } },
    ];
  }

  const pagination = parsePagination({ page, limit });
  const query = {
    where,
    attributes: LIST_ATTRIBUTES,
    include: [{ model: Kategori, as: 'kategori', attributes: ['ID', 'DESKRIPSI'] }],
    order: [['NAMA', 'ASC']],
  };

  if (!pagination) return Produk.findAll(query);
  const result = await Produk.findAndCountAll({
    ...query,
    distinct: true,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginated(result.rows, result.count, pagination);
}

async function getById(id) {
  const produk = await Produk.findByPk(id, {
    include: [{ model: Kategori, as: 'kategori', attributes: ['ID', 'DESKRIPSI'] }],
  });
  if (!produk) throw new ApiError(404, 'Produk tidak ditemukan');
  return produk;
}

async function getByBarcode(barcode) {
  const produk = await Produk.findOne({ where: { BARCODE: barcode } });
  if (!produk) throw new ApiError(404, 'Produk dengan barcode tersebut tidak ditemukan');
  return produk;
}

async function create(data) {
  // Validasi limit plan FREE: maksimal 50 produk. Produk.count() ter-scope merchant.
  const plan = await currentPlan();
  if (plan === 'FREE') {
    const jumlah = await Produk.count();
    if (jumlah >= FREE_MAX_PRODUK) {
      throw new ApiError(403, `Limit produk untuk plan FREE maksimal ${FREE_MAX_PRODUK} produk. Upgrade ke PRO untuk menambahkan produk lebih banyak.`);
    }
  }

  // merchant_id WAJIB dari sesi login (JWT) — TIDAK PERNAH dari frontend.
  // Selain di-set otomatis oleh hook tenant, di-set eksplisit di sini sebagai
  // pengaman supaya kolom merchant_id pasti terisi saat tambah produk.
  const merchantId = activeMerchantId(); // undefined untuk super admin
  const { userId } = getTenant();
  const stokAwal = Number(data.stok) || 0;

  // Buat produk + catat "Stok awal" ke t_rekam_stok secara atomik.
  return sequelize.transaction(async (t) => {
    const produk = await Produk.create({
      NAMA: data.nama,
      ID_KATEGORI: data.id_kategori,
      STOK: stokAwal,
      HARGA_BELI: data.harga_beli,
      HARGA_JUAL: data.harga_jual,
      BARCODE: data.barcode,
      FOTO: data.foto || null,
      ...(merchantId !== undefined ? { MERCHANT_ID: merchantId } : {}),
    }, { transaction: t });

    // Auto-generate barcode bila produk belum punya (CODE128/EAN-13 friendly: numerik).
    // Format: '2' + merchant(4) + id(8) = 13 digit, unik per produk.
    if (!produk.BARCODE || String(produk.BARCODE).trim() === '') {
      const mid = String(merchantId || 0).padStart(4, '0').slice(-4);
      const pid = String(produk.ID).padStart(8, '0').slice(-8);
      await produk.update({ BARCODE: `2${mid}${pid}` }, { transaction: t });
    }

    // Riwayat stok awal hanya dibuat bila ada stok pembukaan (> 0).
    if (stokAwal > 0) {
      await RekamStok.create({
        ID_PRODUK: produk.ID,
        JENIS: 1, // 1 = tambah (stok masuk)
        QTY: stokAwal,
        TANGGAL: new Date(),
        KETERANGAN: 'Stok awal',
        ID_USER: userId ?? null,
        ...(merchantId !== undefined ? { MERCHANT_ID: merchantId } : {}),
      }, { transaction: t });
    }
    return produk;
  });
}

async function update(id, data) {
  const produk = await getById(id);
  const oldFoto = produk.FOTO;
  const newFoto = data.foto ?? produk.FOTO;
  await produk.update({
    NAMA: data.nama ?? produk.NAMA,
    ID_KATEGORI: data.id_kategori ?? produk.ID_KATEGORI,
    HARGA_BELI: data.harga_beli ?? produk.HARGA_BELI,
    HARGA_JUAL: data.harga_jual ?? produk.HARGA_JUAL,
    BARCODE: data.barcode ?? produk.BARCODE,
    FOTO: newFoto,
  });
  // Jika gambar baru diupload, hapus gambar lama.
  if (data.foto && oldFoto && oldFoto !== data.foto) deleteProductImage(oldFoto);
  return produk;
}

async function remove(id) {
  const produk = await getById(id);
  const foto = produk.FOTO;
  await produk.destroy();
  deleteProductImage(foto);
  return true;
}

// Stok insidentil (penyesuaian stok manual) -> mengikuti stokInsidentil() di Admin.php.
// jenis 1 = tambah, 2 = kurang. Mencatat ke t_rekam_stok.
async function adjustStock(id, { jenis, qty, keterangan }) {
  const produk = await getById(id);
  const delta = jenis === 1 ? qty : -qty;
  if (jenis === 2 && produk.STOK < qty) {
    throw new ApiError(400, 'Stok tidak mencukupi untuk pengurangan');
  }
  const merchantId = activeMerchantId();
  const { userId } = getTenant();
  await produk.update({ STOK: produk.STOK + delta });
  await RekamStok.create({
    ID_PRODUK: id,
    JENIS: jenis,
    QTY: qty,
    TANGGAL: new Date(),
    KETERANGAN: keterangan || 'Penyesuaian stok insidentil',
    ID_USER: userId ?? null,
    ...(merchantId !== undefined ? { MERCHANT_ID: merchantId } : {}),
  });
  return produk;
}

async function stockHistory(id, { page, limit } = {}) {
  const pagination = parsePagination({ page, limit }, { defaultLimit: 50 });
  const query = { where: { ID_PRODUK: id }, order: [['ID', 'DESC']] };
  if (!pagination) return RekamStok.findAll({ ...query, limit: 100 });
  const result = await RekamStok.findAndCountAll({
    ...query,
    limit: pagination.limit,
    offset: pagination.offset,
  });
  return paginated(result.rows, result.count, pagination);
}

module.exports = { list, getById, getByBarcode, create, update, remove, adjustStock, stockHistory };
