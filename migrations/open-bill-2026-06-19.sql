-- =====================================================================
-- Migration: Fitur Open Bill / Simpan Pesanan (bayar di akhir)
-- Jalankan MANUAL di MySQL. Aman untuk DB existing; tidak mengubah tabel lama.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Header open bill.
-- STATUS: 'OPEN' | 'PAID' | 'CANCELLED'.
-- ID_PENJUALAN: diisi saat bill dibayar (relasi ke t_penjualan untuk riwayat/laporan).
-- CATATAN STOK: stok TIDAK dikurangi saat OPEN. Stok hanya dikurangi saat
--               bill dibayar (PAID) lewat alur checkout penjualan yang sudah ada.
--               Karena itu pembatalan (CANCELLED) tidak perlu mengembalikan stok.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `t_open_bill` (
  `ID`            int(11) NOT NULL AUTO_INCREMENT,
  `NO_BILL`       varchar(50) DEFAULT NULL,
  `CUSTOMER_NAME` varchar(150) DEFAULT NULL,
  `TABLE_NO`      varchar(30) DEFAULT NULL,
  `NOTE`          text DEFAULT NULL,
  `STATUS`        varchar(12) NOT NULL DEFAULT 'OPEN',
  `TOTAL`         double NOT NULL DEFAULT 0,
  `ID_USER`       int(11) DEFAULT NULL,
  `ID_PENJUALAN`  int(11) DEFAULT NULL,
  `MERCHANT_ID`   int(11) DEFAULT NULL,
  `CREATED_AT`    datetime DEFAULT NULL,
  `UPDATED_AT`    datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uq_openbill_nobill` (`NO_BILL`),
  KEY `idx_openbill_merchant` (`MERCHANT_ID`),
  KEY `idx_openbill_status` (`STATUS`),
  KEY `idx_openbill_user` (`ID_USER`),
  KEY `idx_openbill_penjualan` (`ID_PENJUALAN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Detail item open bill. Harga di-snapshot saat input.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `t_open_bill_detail` (
  `ID`           int(11) NOT NULL AUTO_INCREMENT,
  `ID_OPEN_BILL` int(11) NOT NULL,
  `ID_PRODUK`    int(11) NOT NULL,
  `HARGA_BELI`   int(11) DEFAULT 0,
  `HARGA_JUAL`   int(11) DEFAULT 0,
  `QTY`          double NOT NULL DEFAULT 0,
  `NOTE`         varchar(255) DEFAULT NULL,
  `MERCHANT_ID`  int(11) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_obd_bill` (`ID_OPEN_BILL`),
  KEY `idx_obd_produk` (`ID_PRODUK`),
  KEY `idx_obd_merchant` (`MERCHANT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- (Opsional) Relasi FK — aktifkan bila ingin penegakan di level DB:
-- ALTER TABLE `t_open_bill_detail`
--   ADD CONSTRAINT `fk_obd_bill` FOREIGN KEY (`ID_OPEN_BILL`)
--   REFERENCES `t_open_bill` (`ID`) ON DELETE CASCADE;
