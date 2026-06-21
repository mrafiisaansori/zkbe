const { Qris } = require('../models');
const { deleteQrisImage } = require('../utils/fileUrl');

// Pengaturan QRIS - satu baris per merchant (di-scope otomatis via hook tenant).
async function get() {
  return Qris.findOne();
}

// Update / buat baris pengaturan QRIS.
// data: { merchant_name, nmid, image, is_active }
async function update(data) {
  let row = await get();

  const map = {
    MERCHANT_NAME: data.merchant_name,
    NMID: data.nmid,
    IMAGE: data.image,
    IS_ACTIVE: data.is_active,
  };
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });

  if (!row) {
    row = await Qris.create(map);
  } else {
    // Hapus gambar lama bila diganti dengan gambar baru.
    if (map.IMAGE && row.IMAGE && map.IMAGE !== row.IMAGE) deleteQrisImage(row.IMAGE);
    await row.update(map);
  }
  return row;
}

module.exports = { get, update };
