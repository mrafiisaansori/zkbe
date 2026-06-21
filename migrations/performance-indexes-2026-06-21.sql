-- =====================================================================
-- OPTIMASI PERFORMA: Index untuk query yang sering & berat.
-- Jalankan MANUAL di MySQL.
-- CATATAN: beberapa index merchant_id mungkin SUDAH ADA dari migration
-- sebelumnya (multi-tenant.sql, open-bill, voucher, dll). Jika MySQL menolak
-- karena duplikat ("Duplicate key name"), LEWATI baris itu — tidak masalah.
-- Cek index existing: SHOW INDEX FROM nama_tabel;
-- =====================================================================

-- ---------------------------------------------------------------------
-- PRODUK: pencarian nama, filter kategori, lookup barcode (BARCODE bertipe TEXT
-- jadi pakai prefix length).
-- ---------------------------------------------------------------------
ALTER TABLE `m_produk` ADD INDEX `idx_produk_merchant_nama` (`MERCHANT_ID`, `NAMA`);
ALTER TABLE `m_produk` ADD INDEX `idx_produk_merchant_kategori` (`MERCHANT_ID`, `ID_KATEGORI`);
ALTER TABLE `m_produk` ADD INDEX `idx_produk_barcode` (`BARCODE`(32));

-- ---------------------------------------------------------------------
-- PENJUALAN: laporan & dashboard sering filter (MERCHANT_ID, TANGGAL, STATUS).
-- ---------------------------------------------------------------------
ALTER TABLE `t_penjualan` ADD INDEX `idx_penjualan_merchant_tgl_status` (`MERCHANT_ID`, `TANGGAL`, `STATUS`);
ALTER TABLE `t_penjualan` ADD INDEX `idx_penjualan_user` (`ID_USER`);
ALTER TABLE `t_penjualan` ADD INDEX `idx_penjualan_jenisbayar` (`ID_JENIS_BAYAR`);

-- ---------------------------------------------------------------------
-- DETAIL PENJUALAN: join ke header + agregasi per produk (dashboard/laporan).
-- ---------------------------------------------------------------------
ALTER TABLE `t_detail_penjualan` ADD INDEX `idx_dp_transaksi` (`ID_TRANSAKSI_PENJUALAN`);
ALTER TABLE `t_detail_penjualan` ADD INDEX `idx_dp_produk` (`ID_PRODUK`);
ALTER TABLE `t_detail_penjualan` ADD INDEX `idx_dp_merchant` (`MERCHANT_ID`);

-- ---------------------------------------------------------------------
-- RIWAYAT STOK: filter per produk + per merchant.
-- ---------------------------------------------------------------------
ALTER TABLE `t_rekam_stok` ADD INDEX `idx_rs_produk` (`ID_PRODUK`);
ALTER TABLE `t_rekam_stok` ADD INDEX `idx_rs_merchant_tgl` (`MERCHANT_ID`, `TANGGAL`);

-- ---------------------------------------------------------------------
-- PENGGUNA: login by username + hitung kasir per merchant (validasi plan FREE).
-- ---------------------------------------------------------------------
ALTER TABLE `m_pengguna` ADD INDEX `idx_pengguna_username` (`USERNAME`);
ALTER TABLE `m_pengguna` ADD INDEX `idx_pengguna_merchant_level` (`MERCHANT_ID`, `LEVEL`);

-- ---------------------------------------------------------------------
-- OPEN BILL: list per status & merchant (idx merchant/status mungkin sudah ada).
-- ---------------------------------------------------------------------
ALTER TABLE `t_open_bill` ADD INDEX `idx_openbill_merchant_status` (`MERCHANT_ID`, `STATUS`);
ALTER TABLE `t_open_bill_detail` ADD INDEX `idx_obd_produk2` (`ID_PRODUK`);

-- ---------------------------------------------------------------------
-- DETAIL PEMBELIAN / RETUR (jika dipakai di laporan) — join cepat.
-- ---------------------------------------------------------------------
ALTER TABLE `t_detail_pembelian` ADD INDEX `idx_detpem_transaksi` (`ID_TRANSAKSI_PEMBELIAN`);
ALTER TABLE `t_detail_pembelian` ADD INDEX `idx_detpem_produk` (`ID_PRODUK`);

-- ---------------------------------------------------------------------
-- KATEGORI / QRIS / TAX / VOUCHER: filter merchant (kemungkinan sudah ada).
-- ---------------------------------------------------------------------
ALTER TABLE `m_kategori` ADD INDEX `idx_kategori_merchant` (`MERCHANT_ID`);

-- =====================================================================
-- Setelah index dibuat, jalankan ANALYZE agar optimizer memakai index baru:
-- ANALYZE TABLE m_produk, t_penjualan, t_detail_penjualan, t_rekam_stok,
--   m_pengguna, t_open_bill, t_open_bill_detail, m_kategori;
-- =====================================================================
