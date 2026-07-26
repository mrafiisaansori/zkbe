const { Op, literal } = require('sequelize');
const { Member, Penjualan, DetailPenjualan, Merchant } = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId } = require('../utils/tenancy');
const { parsePagination, paginated } = require('../utils/pagination');

const LIST_ATTRIBUTES = ['ID', 'KODE_MEMBER', 'NAMA', 'NO_HP', 'EMAIL', 'ALAMAT', 'STATUS', 'TANGGAL_DAFTAR'];

async function list({ search, status, page, limit } = {}) {
  const where = {};
  if (status !== undefined) where.STATUS = status;
  if (search) {
    where[Op.or] = [
      { NAMA: { [Op.like]: `%${search}%` } },
      { NO_HP: { [Op.like]: `%${search}%` } },
      { KODE_MEMBER: { [Op.like]: `%${search}%` } },
    ];
  }
  const pagination = parsePagination({ page, limit });
  const query = { where, attributes: LIST_ATTRIBUTES, order: [['ID', 'DESC']] };
  if (!pagination) return Member.findAll(query);
  const result = await Member.findAndCountAll({ ...query, limit: pagination.limit, offset: pagination.offset });
  return paginated(result.rows, result.count, pagination);
}

async function getById(id) {
  const m = await Member.findByPk(id);
  if (!m) throw new ApiError(404, 'Member tidak ditemukan');
  return m;
}

// nama & no_hp wajib (juga dipakai Quick Create Member di halaman kasir).
async function create(data) {
  if (!data.nama || !String(data.nama).trim()) throw new ApiError(422, 'Nama member wajib diisi');
  if (!data.no_hp || !String(data.no_hp).trim()) throw new ApiError(422, 'Nomor HP wajib diisi');

  const member = await Member.create({
    NAMA: String(data.nama).trim(),
    NO_HP: String(data.no_hp).trim(),
    EMAIL: data.email || null,
    ALAMAT: data.alamat || null,
    STATUS: data.status !== undefined ? data.status : 1,
    TANGGAL_DAFTAR: new Date(),
  });
  // Kode member otomatis, pakai prefix nota merchant (mis. "TZK-MBR-000005") -
  // sama seperti nomor struk (NO_NOTA), supaya kode antar merchant tidak bentrok
  // dan gampang dikenali toko mana. Dibuat setelah ID diketahui (ID global unik).
  const merchantId = activeMerchantId();
  const merchant = merchantId ? await Merchant.findByPk(merchantId) : null;
  const prefix = merchant && merchant.INVOICE_PREFIX ? merchant.INVOICE_PREFIX : 'MBR';
  await member.update({ KODE_MEMBER: `${prefix}-MBR-${String(member.ID).padStart(6, '0')}` });
  return member;
}

async function update(id, data) {
  const m = await getById(id);
  await m.update({
    NAMA: data.nama ?? m.NAMA,
    NO_HP: data.no_hp ?? m.NO_HP,
    EMAIL: data.email !== undefined ? data.email : m.EMAIL,
    ALAMAT: data.alamat !== undefined ? data.alamat : m.ALAMAT,
    STATUS: data.status !== undefined ? data.status : m.STATUS,
  });
  return m;
}

async function remove(id) { await (await getById(id)).destroy(); return true; }

/**
 * Detail member + rekap transaksi (untuk halaman detail member):
 * total transaksi, total nilai, total item terjual, transaksi terakhir & riwayat.
 * Hanya menghitung transaksi STATUS=1 (sah, bukan void).
 */
async function getDetail(id) {
  const member = await getById(id);
  const where = { MEMBER_ID: id, STATUS: 1 };

  const [headerAgg = {}] = await Penjualan.findAll({
    where,
    attributes: [
      [literal('COUNT(`t_penjualan`.`ID`)'), 'jumlah_transaksi'],
      [literal('COALESCE(SUM(COALESCE(`t_penjualan`.`TOTAL`, 0)), 0)'), 'total_nilai'],
      [literal('MAX(`t_penjualan`.`TANGGAL`)'), 'transaksi_terakhir'],
    ],
    raw: true,
  });

  const [detailAgg = {}] = await DetailPenjualan.findAll({
    attributes: [[literal('COALESCE(SUM(COALESCE(`t_detail_penjualan`.`QTY`, 0)), 0)'), 'jumlah_item']],
    include: [{ model: Penjualan, as: 'penjualan', attributes: [], where, required: true }],
    raw: true,
  });

  const riwayat = await Penjualan.findAll({
    where,
    attributes: ['ID', 'NO_NOTA', 'TANGGAL', 'JAM', 'TOTAL', 'STATUS_BAYAR'],
    order: [['ID', 'DESC']],
    limit: 50,
  });

  return {
    member,
    rekap: {
      jumlah_transaksi: Number(headerAgg.jumlah_transaksi) || 0,
      total_nilai: Number(headerAgg.total_nilai) || 0,
      jumlah_item: Number(detailAgg.jumlah_item) || 0,
      transaksi_terakhir: headerAgg.transaksi_terakhir || null,
    },
    riwayat,
  };
}

module.exports = { list, getById, create, update, remove, getDetail };
