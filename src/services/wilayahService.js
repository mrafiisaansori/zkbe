const { Provinsi, Kota } = require('../models');

// Daftar provinsi (referensi, publik).
const listProvinsi = () => Provinsi.findAll({ order: [['NAMA', 'ASC']] });

// Daftar kota/kabupaten untuk satu provinsi.
const listKota = (provinsiId) =>
  Kota.findAll({ where: { PROVINSI_ID: String(provinsiId) }, order: [['NAMA', 'ASC']] });

module.exports = { listProvinsi, listKota };
