const { TaxSetting } = require('../models');
const { assertProFeature } = require('../utils/plan');

// Pengaturan pajak per merchant (1 baris, di-scope otomatis lewat hook tenant).
async function get() {
  let row = await TaxSetting.findOne();
  if (!row) row = await TaxSetting.create({}); // default: semua nonaktif
  return row;
}

// data: { ppn_enabled, ppn_persen, service_enabled, service_persen }
async function update(data) {
  await assertProFeature();
  const row = await get();
  const map = {
    PPN_ENABLED: data.ppn_enabled,
    PPN_PERSEN: data.ppn_persen,
    SERVICE_ENABLED: data.service_enabled,
    SERVICE_PERSEN: data.service_persen,
  };
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await row.update(map);
  return row;
}

module.exports = { get, update };
