-- Indeks opsional untuk mempercepat dashboard dan laporan penjualan.
-- MySQL < 8 tidak mendukung ADD INDEX IF NOT EXISTS; abaikan error duplicate
-- bila index sudah pernah dibuat.

ALTER TABLE `t_penjualan`
  ADD INDEX `idx_tpenjualan_dashboard` (`MERCHANT_ID`, `STATUS`, `TANGGAL`, `ID`);

ALTER TABLE `t_detail_penjualan`
  ADD INDEX `idx_tdetailjual_transaksi` (`ID_TRANSAKSI_PENJUALAN`);

