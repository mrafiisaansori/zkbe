-- =====================================================================
-- Migrasi fitur Pembayaran QRIS (statis/manual)
-- Jalankan di database POS existing (mis. lavenia1_pos) via phpMyAdmin / CLI.
-- Aman dijalankan berkali-kali (IF NOT EXISTS / cek duplikat).
-- =====================================================================

-- 1) Tabel pengaturan QRIS (1 baris pengaturan, ID=1).
CREATE TABLE IF NOT EXISTS `m_qris` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `MERCHANT_NAME` varchar(150) DEFAULT NULL,
  `NMID` varchar(50) DEFAULT NULL,
  `IMAGE` text DEFAULT NULL,                       -- path relatif: uploads/qris/<file>
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT 0,       -- 0=nonaktif, 1=aktif
  `CREATED_AT` datetime DEFAULT CURRENT_TIMESTAMP,
  `UPDATED_AT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Baris pengaturan awal (kosong/nonaktif). Admin mengisinya lewat menu Pengaturan > Pembayaran.
INSERT INTO `m_qris` (`ID`, `MERCHANT_NAME`, `NMID`, `IMAGE`, `IS_ACTIVE`)
SELECT 1, NULL, NULL, NULL, 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `m_qris` WHERE `ID` = 1);

-- 2) Kolom status pembayaran pada transaksi penjualan (LUNAS/PAID).
--    Catatan: MySQL < 8.0 tidak mendukung "ADD COLUMN IF NOT EXISTS".
--    Jika kolom sudah ada, abaikan error duplikat kolom.
ALTER TABLE `t_penjualan`
  ADD COLUMN `STATUS_BAYAR` varchar(20) DEFAULT 'LUNAS';

-- Set transaksi lama menjadi LUNAS (yang masih sah/STATUS=1).
UPDATE `t_penjualan` SET `STATUS_BAYAR` = 'LUNAS' WHERE `STATUS_BAYAR` IS NULL;

-- 3) Tambahkan metode pembayaran "QRIS" bila belum ada.
--    Frontend mendeteksi metode QRIS dari NAMA yang mengandung kata "QRIS".
INSERT INTO `m_jenis_bayar` (`NAMA`)
SELECT 'QRIS' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `m_jenis_bayar` WHERE UPPER(`NAMA`) LIKE '%QRIS%');
