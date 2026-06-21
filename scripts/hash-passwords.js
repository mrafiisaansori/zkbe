/**
 * Migrasi sekali jalan: ubah semua password plaintext di m_pengguna menjadi
 * hash bcrypt. Idempotent — baris yang sudah berupa hash dilewati, jadi aman
 * dijalankan berulang.
 *
 * Jalankan dari folder pos-backend:
 *   npm run hash-passwords
 * atau:
 *   node scripts/hash-passwords.js
 */
const sequelize = require('../src/config/database');
const { Pengguna } = require('../src/models');
const { hashPassword, isHashed } = require('../src/utils/password');

(async () => {
  try {
    await sequelize.authenticate();
    const users = await Pengguna.findAll();
    let changed = 0;

    for (const u of users) {
      if (isHashed(u.PASSWORD)) continue;
      await u.update({ PASSWORD: await hashPassword(u.PASSWORD) });
      changed += 1;
      console.log(`  ✓ ${u.USERNAME} (ID ${u.ID}) -> hashed`);
    }

    console.log(`\nSelesai. ${changed} dari ${users.length} password dimigrasi ke bcrypt.`);
    process.exit(0);
  } catch (err) {
    console.error('Gagal migrasi password:', err.message);
    process.exit(1);
  }
})();
