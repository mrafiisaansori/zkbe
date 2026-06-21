-- =====================================================================
-- Migration: Plan FREE/PRO, Pajak & Service Charge, Diskon per item & Voucher,
--            Langganan/Billing (QRIS manual Zona Kasir).
-- Jalankan MANUAL di MySQL. Aman untuk DB existing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Plan merchant (FREE/PRO) + masa aktif PRO.
--    Default FREE. PRO_EXPIRES_AT null = belum pernah PRO.
-- ---------------------------------------------------------------------
ALTER TABLE `m_merchant`
  ADD COLUMN `PLAN` varchar(10) NOT NULL DEFAULT 'FREE' AFTER `STATUS`,
  ADD COLUMN `PRO_EXPIRES_AT` datetime DEFAULT NULL AFTER `PLAN`;

-- ---------------------------------------------------------------------
-- 2) Pengaturan pajak (PPN) & service charge per merchant.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_tax_setting` (
  `ID`              int(11) NOT NULL AUTO_INCREMENT,
  `PPN_ENABLED`     tinyint(1) NOT NULL DEFAULT 0,
  `PPN_PERSEN`      double NOT NULL DEFAULT 0,
  `SERVICE_ENABLED` tinyint(1) NOT NULL DEFAULT 0,
  `SERVICE_PERSEN`  double NOT NULL DEFAULT 0,
  `MERCHANT_ID`     int(11) DEFAULT NULL,
  `CREATED_AT`      datetime DEFAULT NULL,
  `UPDATED_AT`      datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_tax_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3) Voucher / promo per merchant.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_voucher` (
  `ID`            int(11) NOT NULL AUTO_INCREMENT,
  `KODE`          varchar(50) NOT NULL,
  `TIPE`          varchar(10) NOT NULL DEFAULT 'NOMINAL',  -- NOMINAL | PERSEN
  `NILAI`         double NOT NULL DEFAULT 0,
  `MIN_TRANSAKSI` double NOT NULL DEFAULT 0,
  `VALID_FROM`    date DEFAULT NULL,
  `VALID_UNTIL`   date DEFAULT NULL,
  `IS_ACTIVE`     tinyint(1) NOT NULL DEFAULT 1,
  `MERCHANT_ID`   int(11) DEFAULT NULL,
  `CREATED_AT`    datetime DEFAULT NULL,
  `UPDATED_AT`    datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uq_voucher_merchant_kode` (`MERCHANT_ID`, `KODE`),
  KEY `idx_voucher_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4) Kolom pajak/voucher pada transaksi penjualan + diskon per item.
-- ---------------------------------------------------------------------
ALTER TABLE `t_penjualan`
  ADD COLUMN `PPN` double NOT NULL DEFAULT 0 AFTER `DISKON`,
  ADD COLUMN `SERVICE_CHARGE` double NOT NULL DEFAULT 0 AFTER `PPN`,
  ADD COLUMN `KODE_VOUCHER` varchar(50) DEFAULT NULL AFTER `SERVICE_CHARGE`,
  ADD COLUMN `DISKON_VOUCHER` double NOT NULL DEFAULT 0 AFTER `KODE_VOUCHER`;

ALTER TABLE `t_detail_penjualan`
  ADD COLUMN `DISKON` double NOT NULL DEFAULT 0 AFTER `QTY`;

-- ---------------------------------------------------------------------
-- 5) Pengaturan langganan Zona Kasir (GLOBAL, dikelola Super Admin).
--    Hanya 1 baris (ID=1).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_subscription_setting` (
  `ID`               int(11) NOT NULL AUTO_INCREMENT,
  `QRIS_IMAGE`       text DEFAULT NULL,
  `QRIS_LABEL`       varchar(150) DEFAULT NULL,
  `PRICE_MONTHLY`    int(11) NOT NULL DEFAULT 0,
  `PRICE_YEARLY`     int(11) NOT NULL DEFAULT 0,
  `PAYMENT_TTL_HOURS` int(11) NOT NULL DEFAULT 24,
  `CREATED_AT`       datetime DEFAULT NULL,
  `UPDATED_AT`       datetime DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `m_subscription_setting` (`ID`, `PRICE_MONTHLY`, `PRICE_YEARLY`, `PAYMENT_TTL_HOURS`)
SELECT 1, 50000, 500000, 24
WHERE NOT EXISTS (SELECT 1 FROM `m_subscription_setting` WHERE `ID` = 1);

-- ---------------------------------------------------------------------
-- 6) Pembayaran langganan PRO per merchant (QRIS manual + kode unik).
--    STATUS: PENDING | WAITING_VERIFICATION | VERIFIED | REJECTED | EXPIRED.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_subscription_payment` (
  `ID`            int(11) NOT NULL AUTO_INCREMENT,
  `PAKET`         varchar(10) NOT NULL,                 -- BULANAN | TAHUNAN
  `HARGA`         int(11) NOT NULL DEFAULT 0,
  `KODE_UNIK`     int(11) NOT NULL DEFAULT 0,           -- 3 digit
  `TOTAL_BAYAR`   int(11) NOT NULL DEFAULT 0,
  `BUKTI`         text DEFAULT NULL,
  `STATUS`        varchar(25) NOT NULL DEFAULT 'PENDING',
  `REJECT_REASON` text DEFAULT NULL,
  `EXPIRES_AT`    datetime DEFAULT NULL,
  `PAID_AT`       datetime DEFAULT NULL,
  `VERIFIED_AT`   datetime DEFAULT NULL,
  `VERIFIED_BY`   int(11) DEFAULT NULL,
  `ID_USER`       int(11) DEFAULT NULL,
  `MERCHANT_ID`   int(11) DEFAULT NULL,
  `CREATED_AT`    datetime DEFAULT NULL,
  `UPDATED_AT`    datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_subpay_merchant` (`MERCHANT_ID`),
  KEY `idx_subpay_status` (`STATUS`),
  KEY `idx_subpay_kode` (`KODE_UNIK`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Catatan logic:
-- * Plan expired: jika PLAN='PRO' dan PRO_EXPIRES_AT < NOW(), merchant
--   diperlakukan sebagai FREE (limit produk/kasir aktif kembali) dan saat
--   diakses, PLAN otomatis dinormalisasi ke 'FREE' (lazy downgrade).
-- * Kode unik 3 digit dijamin tidak bentrok dengan pembayaran PENDING/
--   WAITING_VERIFICATION lain yang masih aktif (cek di aplikasi).
-- =====================================================================
