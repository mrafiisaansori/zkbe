const { Op } = require('sequelize');
const { Pengguna, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { hashPassword, verifyPassword, generatePassword } = require('../utils/password');
const { currentPlan, FREE_MAX_KASIR } = require('../utils/plan');

// Manajemen user. Password disimpan sebagai hash bcrypt.
const PUBLIC_ATTR = ['ID', 'NAMA', 'USERNAME', 'LEVEL', 'TELP'];

const KASIR = 2;
const GUDANG = 3;
// Role yang BOLEH dikelola admin merchant: Kasir & Gudang (bukan Admin/Super Admin).
const MANAGEABLE_LEVELS = [KASIR, GUDANG];

/**
 * Cek apakah username sudah dipakai SECARA GLOBAL (lintas merchant).
 * Penting: login mencari user by USERNAME tanpa scope merchant, sehingga
 * username yang sama di 2 merchant menyebabkan tabrakan login (akun salah
 * yang cocok). Maka username wajib unik global. Memakai raw query agar TIDAK
 * terkena hook tenant (yang akan membatasi pengecekan ke 1 merchant saja).
 */
async function usernameTaken(username, exceptId) {
  const [rows] = await sequelize.query(
    'SELECT ID FROM m_pengguna WHERE USERNAME = ? LIMIT 1',
    { replacements: [String(username || '').trim()] },
  );
  if (!rows || rows.length === 0) return false;
  if (exceptId && Number(rows[0].ID) === Number(exceptId)) return false;
  return true;
}

// Daftar pengguna: Kasir (LEVEL 2) & Gudang (LEVEL 3) milik merchant ini. Akun
// Admin sengaja disembunyikan agar admin merchant tidak menghapus akun admin utama.
const list = () => Pengguna.findAll({ where: { LEVEL: { [Op.in]: MANAGEABLE_LEVELS } }, attributes: PUBLIC_ATTR, order: [['LEVEL', 'ASC'], ['NAMA', 'ASC']] });

async function getById(id) {
  const u = await Pengguna.findByPk(id, { attributes: PUBLIC_ATTR });
  if (!u) throw new ApiError(404, 'Pengguna tidak ditemukan');
  return u;
}

async function create(data) {
  // Admin merchant HANYA boleh membuat user Kasir atau Gudang (bukan Admin/Super Admin).
  // Divalidasi di backend agar tidak bisa di-bypass dari frontend.
  if (!MANAGEABLE_LEVELS.includes(Number(data.level))) {
    throw new ApiError(403, 'Role tidak diizinkan. Hanya Kasir atau Gudang yang dapat dibuat.');
  }

  // Validasi limit plan FREE: hanya 1 kasir (LEVEL 2). Gudang (LEVEL 3) tidak dibatasi.
  if (Number(data.level) === KASIR) {
    const plan = await currentPlan();
    if (plan === 'FREE') {
      const jumlahKasir = await Pengguna.count({ where: { LEVEL: KASIR } });
      if (jumlahKasir >= FREE_MAX_KASIR) {
        throw new ApiError(403, `Plan FREE hanya mendukung ${FREE_MAX_KASIR} kasir. Upgrade ke PRO untuk menambahkan multiple kasir.`);
      }
    }
  }

  if (await usernameTaken(data.username)) {
    throw new ApiError(409, 'Username sudah digunakan, silakan gunakan username lain.');
  }
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
  // Hanya boleh mengubah akun Kasir/Gudang (bukan akun Admin).
  if (!MANAGEABLE_LEVELS.includes(Number(u.LEVEL))) {
    throw new ApiError(403, 'Akun ini tidak dapat diubah dari sini.');
  }
  if (data.level !== undefined && !MANAGEABLE_LEVELS.includes(Number(data.level))) {
    throw new ApiError(403, 'Role tidak diizinkan. Hanya Kasir atau Gudang.');
  }
  // Bila username diganti, pastikan tetap unik global.
  if (data.username && data.username !== u.USERNAME && await usernameTaken(data.username, u.ID)) {
    throw new ApiError(409, 'Username sudah digunakan, silakan gunakan username lain.');
  }
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
  // Admin merchant TIDAK boleh menghapus akun admin/super admin — hanya Kasir/Gudang.
  if (!MANAGEABLE_LEVELS.includes(Number(u.LEVEL))) {
    throw new ApiError(403, 'Hanya akun Kasir/Gudang yang dapat dihapus. Akun admin tidak boleh dihapus.');
  }
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
