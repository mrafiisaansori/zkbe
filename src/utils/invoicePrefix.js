const crypto = require('crypto');
const { Op } = require('sequelize');
const { Merchant } = require('../models');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeInvoicePrefix(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
}

function randomSuffix(length = 2) {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return result;
}

function baseFromStoreName(storeName) {
  return normalizeInvoicePrefix(storeName).slice(0, 3) || 'TK';
}

async function prefixExists(prefix, { excludeMerchantId, transaction } = {}) {
  const where = { INVOICE_PREFIX: prefix };
  if (excludeMerchantId) where.ID = { [Op.ne]: excludeMerchantId };
  return Merchant.count({ where, transaction }).then((count) => count > 0);
}

async function makeInvoicePrefix(storeName, options = {}) {
  const base = baseFromStoreName(storeName);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const suffixLength = attempt < 40 ? 2 : 3;
    const candidate = `${base}${randomSuffix(suffixLength)}`.slice(0, 15);
    if (!(await prefixExists(candidate, options))) return candidate;
  }
  throw new Error('Gagal membuat prefix nota unik. Silakan coba lagi.');
}

async function assertInvoicePrefixUnique(prefix, options = {}) {
  const normalized = normalizeInvoicePrefix(prefix);
  if (!normalized) {
    const err = new Error('Prefix nota tidak boleh kosong.');
    err.statusCode = 422;
    throw err;
  }
  if (await prefixExists(normalized, options)) {
    const err = new Error('Prefix nota sudah dipakai toko lain, pilih prefix lain.');
    err.statusCode = 409;
    throw err;
  }
  return normalized;
}

module.exports = {
  normalizeInvoicePrefix,
  makeInvoicePrefix,
  assertInvoicePrefixUnique,
};
