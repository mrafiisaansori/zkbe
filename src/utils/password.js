const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 10;

/**
 * Generate password acak yang cukup aman: kombinasi huruf besar, kecil, angka,
 * dan simbol. Menjamin minimal 1 dari tiap kategori, sisanya acak.
 */
function generatePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digit = '23456789';
  const symbol = '!@#$%^&*?';
  const all = upper + lower + digit + symbol;
  const pick = (set) => set[crypto.randomInt(set.length)];

  const chars = [pick(upper), pick(lower), pick(digit), pick(symbol)];
  for (let i = chars.length; i < length; i += 1) chars.push(pick(all));
  // Acak urutan agar posisi karakter wajib tidak tertebak.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Deteksi apakah sebuah nilai sudah berupa hash bcrypt ($2a$/$2b$/$2y$).
function isHashed(value) {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value);
}

// Hash password plaintext menjadi bcrypt.
async function hashPassword(plain) {
  return bcrypt.hash(String(plain ?? ''), SALT_ROUNDS);
}

/**
 * Verifikasi password.
 * - Jika nilai tersimpan sudah hash bcrypt → bandingkan dengan bcrypt.compare.
 * - Jika masih plaintext (data lama belum dimigrasi) → bandingkan langsung,
 *   supaya login tetap jalan selama masa transisi.
 */
async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (isHashed(stored)) return bcrypt.compare(String(plain ?? ''), stored);
  return String(plain ?? '') === String(stored);
}

module.exports = { SALT_ROUNDS, isHashed, hashPassword, verifyPassword, generatePassword };
