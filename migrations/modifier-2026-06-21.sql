-- =====================================================================
-- Migration: Modifier / Varian Produk (ukuran, topping, level gula, dll).
-- Jalankan MANUAL di MySQL. Aman untuk DB existing.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Grup modifier (mis. "Ukuran", "Topping", "Level Gula").
--    TIPE: SINGLE (pilih satu) | MULTI (pilih banyak). WAJIB: harus dipilih.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_modifier_group` (
  `ID`          int(11) NOT NULL AUTO_INCREMENT,
  `NAMA`        varchar(100) NOT NULL,
  `TIPE`        varchar(10) NOT NULL DEFAULT 'SINGLE',
  `WAJIB`       tinyint(1) NOT NULL DEFAULT 0,
  `MERCHANT_ID` int(11) DEFAULT NULL,
  `CREATED_AT`  datetime DEFAULT NULL,
  `UPDATED_AT`  datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_modgroup_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2) Opsi tiap grup (mis. "Large +3000", "Boba +5000"). HARGA = tambahan.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_modifier_option` (
  `ID`          int(11) NOT NULL AUTO_INCREMENT,
  `ID_GROUP`    int(11) NOT NULL,
  `NAMA`        varchar(100) NOT NULL,
  `HARGA`       int(11) NOT NULL DEFAULT 0,
  `MERCHANT_ID` int(11) DEFAULT NULL,
  `CREATED_AT`  datetime DEFAULT NULL,
  `UPDATED_AT`  datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_modopt_group` (`ID_GROUP`),
  KEY `idx_modopt_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3) Relasi produk <-> grup modifier (grup mana berlaku untuk produk mana).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_produk_modifier` (
  `ID`          int(11) NOT NULL AUTO_INCREMENT,
  `ID_PRODUK`   int(11) NOT NULL,
  `ID_GROUP`    int(11) NOT NULL,
  `MERCHANT_ID` int(11) DEFAULT NULL,
  `CREATED_AT`  datetime DEFAULT NULL,
  `UPDATED_AT`  datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uq_prodmod` (`ID_PRODUK`, `ID_GROUP`),
  KEY `idx_prodmod_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4) Catatan modifier pada detail transaksi & open bill (untuk struk/riwayat).
--    HARGA_JUAL pada detail menyimpan harga efektif (base + total modifier).
-- ---------------------------------------------------------------------
ALTER TABLE `t_detail_penjualan`
  ADD COLUMN `MODIFIER` text DEFAULT NULL AFTER `QTY`;

ALTER TABLE `t_open_bill_detail`
  ADD COLUMN `MODIFIER` text DEFAULT NULL AFTER `QTY`,
  ADD COLUMN `MODIFIER_OPTIONS` varchar(255) DEFAULT NULL AFTER `MODIFIER`;
