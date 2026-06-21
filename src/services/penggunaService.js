const { Pengguna } = require('../models');
const ApiError = require('../utils/ApiError');
const { hashPassword, verifyPassword, generatePassword } = require('../utils/password');
const { currentPlan, FREE_MAX_KASIR } = require('../utils/plan');

// Manajemen user. Password disimpan sebagai hash bcrypt.
const PUBLIC_ATTR = ['ID', 'NAMA', 'USERNAME', 'LEVEL', 'TELP'];

const list = () => Pengguna.findAll({ attributes: PUBLIC_ATTR, order: [['NAMA', 'ASC']] });

async function getById(id) {
  const u = await Pengguna.findByPk(id, { attributes: PUBLIC_ATTR });
  if (!u) throw new ApiError(404, 'Pengguna tidak ditemukan');
  return u;
}

async function create(data) {
  // Validasi limit plan FREE: hanya 1 kasir (LEVEL 2). Admin (LEVEL 1) tidak dibatasi.
  if (Number(data.level) === 2) {
    const plan = await currentPlan();
    if (plan === 'FREE') {
      const jumlahKasir = await Pengguna.count({ where: { LEVEL: 2 } });
      if (jumlahKasir >= FREE_MAX_KASIR) {
        throw new ApiError(403, `Plan FREE hanya mendukung ${FREE_MAX_KASIR} kasir. Upgrade ke PRO untuk menambahkan multiple kasir.`);
      }
    }
  }

  const exists = await Pengguna.findOne({ where: { USERNAME: data.username } });
  if (exists) throw new ApiError(409, 'Username sudah digunakan');
  const u = await Pengguna.create({
    NAMA: data.nama,
    USERNAME: data.username,
    PASSWORD: await hashPassword(data.password),
    LEVEL: data.level,
    TELP: data.telp || '',
  });
  return getById(u.ID);
}

async function update(id, data) {
  const u = await Pengguna.findByPk(id);
  if (!u) throw new ApiError(404, 'Pengguna tidak ditemukan');
  await u.update({
    NAMA: data.nama ?? u.NAMA,
    USERNAME: data.username ?? u.USERNAME,
    LEVEL: data.level ?? u.LEVEL,
    TELP: data.telp ?? u.TELP,
  });
  return getById(id);
}

async function remove(id) {
  const u = await Pengguna.findByPk(id);
  if (!u) throw new ApiError(404, 'Pengguna tidak ditemukan');
  await u.destroy();
  return true;
}

/**
 * Reset password oleh admin.
 * - TIDAK lagi memakai password default "rahasia".
 * - Generate password acak yang aman (huruf besar/kecil/angka/simbol).
 * - Simpan dalam bentuk hash; kembalikan plaintext SEKALI untuk ditampilkan.
 * - Scoping merchant otomatis via hook (findByPk ter-filter), jadi admin
 *   merchant A tidak bisa mereset user merchant B.
 */
async function resetPassword(id) {
  const u = await Pengguna.findByPk(id);
  if (!u) throw new ApiError(404, 'Pengguna tidak ditemukan');
  const newPassword = generatePassword(12);
  await u.update({ PASSWORD: await hashPassword(newPassword) });
  return { username: u.USERNAME, password: newPassword };
}

async function changePassword(id, { old_password, new_password }) {
  const u = await Pengguna.findByPk(id);
  if (!u) throw new ApiError(404, 'Pengguna tidak ditemukan');
  const ok = await verifyPassword(old_password, u.PASSWORD);
  if (!ok) throw new ApiError(400, 'Password lama tidak sesuai');
  await u.update({ PASSWORD: await hashPassword(new_password) });
  return true;
}

module.exports = { list, getById, create, update, remove, resetPassword, changePassword };
