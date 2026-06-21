const { Identitas } = require('../models');

// Identitas toko - satu baris per merchant (di-scope otomatis via hook tenant).
async function get() {
  return Identitas.findOne();
}
async function update(data) {
  let row = await get();
  const map = { NAMA: data.nama, ALAMAT: data.alamat, NO_TELP: data.no_telp, EMAIL: data.email, WEBSITE: data.website, LOGO: data.logo, BANNER: data.banner };
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  if (!row) { row = await Identitas.create(map); } else { await row.update(map); }
  return row;
}
module.exports = { get, update };
