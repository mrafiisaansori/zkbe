-- =====================================================================
-- Migration: Katalog online (slug + banner) & QR Menu/Self Order (meja).
-- Jalankan MANUAL di MySQL. Aman untuk DB existing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Slug katalog publik per merchant (unik global): zonakasir.com/store/{slug}
-- ---------------------------------------------------------------------
ALTER TABLE `m_merchant`
  ADD COLUMN `SLUG` varchar(80) DEFAULT NULL AFTER `INVOICE_PREFIX`;

ALTER TABLE `m_merchant`
  ADD UNIQUE KEY `uq_merchant_slug` (`SLUG`);

-- ---------------------------------------------------------------------
-- 2) Banner toko untuk katalog (logo sudah ada di m_identitas.LOGO).
-- ---------------------------------------------------------------------
ALTER TABLE `m_identitas`
  ADD COLUMN `BANNER` text DEFAULT NULL AFTER `LOGO`;

-- ---------------------------------------------------------------------
-- 3) Meja + QR Menu (self order). QR_TOKEN unik global (dipakai di URL publik).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_meja` (
  `ID`          int(11) NOT NULL AUTO_INCREMENT,
  `NOMOR`       varchar(50) NOT NULL,
  `QR_TOKEN`    varchar(40) NOT NULL,
  `IS_ACTIVE`   tinyint(1) NOT NULL DEFAULT 1,
  `MERCHANT_ID` int(11) DEFAULT NULL,
  `CREATED_AT`  datetime DEFAULT NULL,
  `UPDATED_AT`  datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uq_meja_token` (`QR_TOKEN`),
  KEY `idx_meja_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Catatan:
-- * SLUG dipakai untuk katalog publik (tanpa login). QR_TOKEN dipakai untuk
--   menu publik per meja (tanpa login). Keduanya memetakan ke MERCHANT_ID di
--   server — frontend TIDAK pernah mengirim merchant_id.
-- * Pesanan self-order otomatis masuk ke t_open_bill milik merchant tsb (PRO).
-- =====================================================================
