-- =====================================================================
-- MIGRASI MULTI-TENANT (Multiple Merchant / Multi Toko)
-- Jalankan MANUAL di database POS existing (mis. `pos` / `lavenia1_pos`).
-- Catatan: backup database dulu sebelum menjalankan.
-- MySQL < 8.0 TIDAK mendukung "ADD COLUMN IF NOT EXISTS" / "ADD INDEX IF NOT EXISTS".
-- Bila kolom/index sudah ada, abaikan error duplikat pada baris terkait.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABEL BARU: m_merchant (tenant / toko)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_merchant` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA` varchar(150) DEFAULT NULL,
  `OWNER_NAME` varchar(150) DEFAULT NULL,
  `EMAIL` varchar(150) DEFAULT NULL,
  `PHONE` varchar(30) DEFAULT NULL,
  `ADDRESS` text DEFAULT NULL,
  `CITY` varchar(100) DEFAULT NULL,
  `PROVINCE` varchar(100) DEFAULT NULL,
  `BUSINESS_CATEGORY` varchar(100) DEFAULT NULL,
  `INVOICE_PREFIX` varchar(15) DEFAULT NULL,
  `STATUS` varchar(20) NOT NULL DEFAULT 'active',  -- active | suspended | pending
  `CREATED_AT` datetime DEFAULT CURRENT_TIMESTAMP,
  `UPDATED_AT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uq_merchant_email` (`EMAIL`),
  UNIQUE KEY `uq_merchant_phone` (`PHONE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ---------------------------------------------------------------------
-- 2) TABEL BARU: m_registration_otp (registrasi merchant pending + OTP)
--    OTP_HASH = hash bcrypt (bukan plaintext). PAYLOAD = JSON data sementara.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_registration_otp` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `EMAIL` varchar(150) DEFAULT NULL,
  `PHONE` varchar(30) DEFAULT NULL,
  `OTP_HASH` varchar(100) DEFAULT NULL,
  `PAYLOAD` text DEFAULT NULL,
  `EXPIRES_AT` datetime DEFAULT NULL,
  `LAST_SENT_AT` datetime DEFAULT NULL,
  `ATTEMPTS` int(11) NOT NULL DEFAULT 0,
  `VERIFIED` tinyint(1) NOT NULL DEFAULT 0,
  `CREATED_AT` datetime DEFAULT CURRENT_TIMESTAMP,
  `UPDATED_AT` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  KEY `idx_reg_email` (`EMAIL`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- ---------------------------------------------------------------------
-- 3) MERCHANT DEFAULT untuk migrasi data lama (single -> multi tenant)
--    Diberi ID = 1. Ambil nama dari m_identitas bila ada.
-- ---------------------------------------------------------------------
INSERT INTO `m_merchant` (`ID`, `NAMA`, `OWNER_NAME`, `EMAIL`, `PHONE`, `ADDRESS`, `INVOICE_PREFIX`, `STATUS`)
SELECT 1,
       COALESCE((SELECT `NAMA` FROM `m_identitas` ORDER BY `ID` ASC LIMIT 1), 'Toko Default'),
       'Owner Default',
       COALESCE((SELECT `EMAIL` FROM `m_identitas` ORDER BY `ID` ASC LIMIT 1), NULL),
       COALESCE((SELECT `NO_TELP` FROM `m_identitas` ORDER BY `ID` ASC LIMIT 1), NULL),
       COALESCE((SELECT `ALAMAT` FROM `m_identitas` ORDER BY `ID` ASC LIMIT 1), NULL),
       'TZK',
       'active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `m_merchant` WHERE `ID` = 1);

-- ---------------------------------------------------------------------
-- 4) TAMBAH KOLOM MERCHANT_ID ke semua tabel tenant
--    (jalankan satu per satu; abaikan error bila kolom sudah ada)
-- ---------------------------------------------------------------------
ALTER TABLE `m_pengguna`           ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `m_produk`             ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `m_kategori`           ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `m_supplier`           ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `m_jenis_bayar`        ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `m_identitas`          ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `m_qris`               ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_penjualan`          ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_detail_penjualan`   ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_pembelian`          ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_detail_pembelian`   ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_retur`              ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_detail_retur`       ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_rekam_stok`         ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_penyusutan_produk`  ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;
ALTER TABLE `t_transaksi`          ADD COLUMN `MERCHANT_ID` int(11) DEFAULT NULL;

-- ---------------------------------------------------------------------
-- 5) BACKFILL: semua data lama menjadi milik merchant default (ID = 1)
-- ---------------------------------------------------------------------
UPDATE `m_pengguna`           SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `m_produk`             SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `m_kategori`           SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `m_supplier`           SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `m_jenis_bayar`        SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `m_identitas`          SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `m_qris`               SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_penjualan`          SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_detail_penjualan`   SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_pembelian`          SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_detail_pembelian`   SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_retur`              SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_detail_retur`       SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_rekam_stok`         SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_penyusutan_produk`  SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;
UPDATE `t_transaksi`          SET `MERCHANT_ID` = 1 WHERE `MERCHANT_ID` IS NULL;

-- Super admin = LEVEL 0 (global, tanpa merchant). User lama LEVEL 1/2 tetap
-- menjadi Admin Merchant / Kasir milik merchant default. (lihat langkah 8)

-- ---------------------------------------------------------------------
-- 6) INDEX untuk performa filter per-merchant
--    (abaikan error bila index sudah ada)
-- ---------------------------------------------------------------------
ALTER TABLE `m_pengguna`           ADD INDEX `idx_mpengguna_merchant` (`MERCHANT_ID`);
ALTER TABLE `m_produk`             ADD INDEX `idx_mproduk_merchant` (`MERCHANT_ID`);
ALTER TABLE `m_kategori`           ADD INDEX `idx_mkategori_merchant` (`MERCHANT_ID`);
ALTER TABLE `m_supplier`           ADD INDEX `idx_msupplier_merchant` (`MERCHANT_ID`);
ALTER TABLE `m_jenis_bayar`        ADD INDEX `idx_mjenisbayar_merchant` (`MERCHANT_ID`);
ALTER TABLE `m_identitas`          ADD INDEX `idx_midentitas_merchant` (`MERCHANT_ID`);
ALTER TABLE `m_qris`               ADD INDEX `idx_mqris_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_penjualan`          ADD INDEX `idx_tpenjualan_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_detail_penjualan`   ADD INDEX `idx_tdetailjual_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_pembelian`          ADD INDEX `idx_tpembelian_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_detail_pembelian`   ADD INDEX `idx_tdetailbeli_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_retur`              ADD INDEX `idx_tretur_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_detail_retur`       ADD INDEX `idx_tdetailretur_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_rekam_stok`         ADD INDEX `idx_trekamstok_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_penyusutan_produk`  ADD INDEX `idx_tpenyusutan_merchant` (`MERCHANT_ID`);
ALTER TABLE `t_transaksi`          ADD INDEX `idx_ttransaksi_merchant` (`MERCHANT_ID`);

-- ---------------------------------------------------------------------
-- 7) (OPSIONAL) FOREIGN KEY ke m_merchant.
--    Aktifkan hanya bila semua MERCHANT_ID sudah terisi & tipe/charset cocok.
--    Contoh untuk beberapa tabel utama:
-- ---------------------------------------------------------------------
-- ALTER TABLE `m_pengguna`  ADD CONSTRAINT `fk_pengguna_merchant`  FOREIGN KEY (`MERCHANT_ID`) REFERENCES `m_merchant`(`ID`);
-- ALTER TABLE `m_produk`    ADD CONSTRAINT `fk_produk_merchant`    FOREIGN KEY (`MERCHANT_ID`) REFERENCES `m_merchant`(`ID`);
-- ALTER TABLE `t_penjualan` ADD CONSTRAINT `fk_penjualan_merchant` FOREIGN KEY (`MERCHANT_ID`) REFERENCES `m_merchant`(`ID`);
-- ... (ulangi untuk tabel lain sesuai kebutuhan)

-- ---------------------------------------------------------------------
-- 8) (OPSIONAL) Buat akun SUPER ADMIN (LEVEL 0, MERCHANT_ID NULL).
--    Ganti <BCRYPT_HASH> dengan hash bcrypt dari password pilihan Anda.
--    Cara cepat membuat hash: jalankan di pos-backend:
--      node -e "console.log(require('bcryptjs').hashSync('PasswordAnda', 10))"
-- ---------------------------------------------------------------------
-- INSERT INTO `m_pengguna` (`NAMA`, `USERNAME`, `PASSWORD`, `LEVEL`, `MERCHANT_ID`)
-- VALUES ('Super Admin', 'superadmin', '<BCRYPT_HASH>', 0, NULL);

-- =====================================================================
-- SELESAI. Setelah ini: di pos-backend jalankan `npm install` (jsonwebtoken,
-- nodemailer) dan set variabel .env (JWT_SECRET, SMTP_*). Lihat .env.example.
-- =====================================================================
