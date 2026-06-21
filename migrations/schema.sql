-- =====================================================================
-- POS Backend - Schema Migration
-- Diturunkan dari dump CodeIgniter existing (lavenia1_pos.sql).
-- Jalankan HANYA pada database BARU/kosong. JANGAN dijalankan pada
-- database production existing (dapat menimpa data).
--   mysql -u root -p nama_db < migrations/schema.sql
-- =====================================================================
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `m_identitas` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA` varchar(150) DEFAULT NULL,
  `ALAMAT` text DEFAULT NULL,
  `NO_TELP` varchar(20) DEFAULT NULL,
  `EMAIL` varchar(100) DEFAULT NULL,
  `WEBSITE` varchar(100) DEFAULT NULL,
  `LOGO` text DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `m_jenis_bayar` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA` varchar(100) DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `m_kategori` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `DESKRIPSI` varchar(150) DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `m_pengguna` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA` varchar(100) DEFAULT NULL,
  `USERNAME` varchar(100) DEFAULT NULL,
  `PASSWORD` varchar(100) DEFAULT NULL,
  `LEVEL` int(1) DEFAULT NULL COMMENT '1.admin,2.kasir',
  `TELP` varchar(20) DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `m_produk` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA` varchar(150) DEFAULT NULL,
  `ID_KATEGORI` int(11) DEFAULT NULL,
  `STOK` double DEFAULT NULL,
  `HARGA_BELI` int(11) DEFAULT NULL,
  `HARGA_JUAL` int(11) DEFAULT NULL,
  `BARCODE` text DEFAULT NULL,
  `FOTO` text DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `m_supplier` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA` varchar(100) DEFAULT NULL,
  `ALAMAT` text DEFAULT NULL,
  `NO_TELP` varchar(20) DEFAULT NULL,
  `NAMA_PIC` varchar(100) DEFAULT NULL,
  `NO_TELP_PIC` varchar(20) DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_detail_pembelian` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ID_TRANSAKSI_PEMBELIAN` int(11) DEFAULT NULL,
  `ID_PRODUK` int(11) DEFAULT NULL,
  `HARGA_BELI` int(11) DEFAULT NULL,
  `QTY` double DEFAULT NULL COMMENT 'Decimal 2',
  `QTY_LAMA` double DEFAULT NULL COMMENT 'Decimal 2',
  `ID_SUPPLIER` int(11) DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_detail_penjualan` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ID_TRANSAKSI_PENJUALAN` int(11) DEFAULT NULL,
  `ID_PRODUK` int(11) DEFAULT NULL,
  `HARGA_BELI` int(11) DEFAULT NULL,
  `HARGA_JUAL` int(11) DEFAULT NULL,
  `QTY` double DEFAULT NULL COMMENT 'decimal 2'
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_detail_retur` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ID_TRANSAKSI_RETUR` int(11) DEFAULT NULL,
  `ID_PRODUK` int(11) DEFAULT NULL,
  `QTY` double DEFAULT NULL COMMENT 'Decimal 2',
  `QTY_LAMA` double DEFAULT NULL COMMENT 'Decimal 2',
  `ID_SUPPLIER` int(11) DEFAULT NULL,
  `KETERANGAN` text DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_pembelian` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NO_NOTA` varchar(50) DEFAULT NULL,
  `TANGGAL` date DEFAULT NULL,
  `ID_USER` int(11) DEFAULT NULL,
  `STATUS` int(1) DEFAULT 0
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_penjualan` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `TANGGAL` date DEFAULT NULL,
  `JAM` time DEFAULT NULL,
  `ID_JENIS_BAYAR` int(11) DEFAULT NULL,
  `TOTAL` varchar(100) DEFAULT NULL,
  `ID_USER` int(11) DEFAULT NULL,
  `KETERANGAN` text DEFAULT NULL,
  `DISKON` varchar(255) DEFAULT NULL,
  `STATUS` int(11) DEFAULT 1
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_penyusutan_produk` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ID_PRODUK` int(11) DEFAULT NULL,
  `HARGA_JUAL_AWAL` int(11) DEFAULT NULL,
  `HARGA_JUAL_AKHIR` int(11) DEFAULT NULL,
  `PROSENTASE_PENYUSUTAN` int(11) DEFAULT NULL,
  `TANGGAL` datetime DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_rekam_stok` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ID_PRODUK` int(11) DEFAULT NULL,
  `JENIS` int(11) DEFAULT NULL COMMENT '1.Restok,2.retur',
  `QTY` double DEFAULT NULL COMMENT 'decimal 2',
  `TANGGAL` datetime DEFAULT NULL,
  `KETERANGAN` text DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_retur` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NO_NOTA` varchar(50) DEFAULT NULL,
  `TANGGAL` date DEFAULT NULL,
  `ID_USER` int(11) DEFAULT NULL,
  `STATUS` int(1) DEFAULT 0
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `t_transaksi` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `NAMA_TRANSAKSI` text DEFAULT NULL,
  `JENIS_TRANSAKSI` varchar(1) DEFAULT NULL,
  `NOMINAL` varchar(255) DEFAULT NULL,
  `TANGGAL` date DEFAULT NULL
,  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE OR REPLACE VIEW `view_detail_pembelian`  AS SELECT `t_detail_pembelian`.`ID` AS `ID_DETAIL_PEMBELIAN`, `t_detail_pembelian`.`ID_TRANSAKSI_PEMBELIAN` AS `ID_TRANSAKSI_PEMBELIAN`, `t_pembelian`.`NO_NOTA` AS `NO_NOTA`, `t_detail_pembelian`.`ID_PRODUK` AS `ID_PRODUK`, `m_produk`.`NAMA` AS `NAMA_PRODUK`, `m_produk`.`ID_KATEGORI` AS `ID_KATEGORI`, `m_kategori`.`DESKRIPSI` AS `DESKRIPSI_KATEGORI`, `t_detail_pembelian`.`HARGA_BELI` AS `HARGA_BELI`, `t_detail_pembelian`.`QTY` AS `QTY`, `t_detail_pembelian`.`QTY_LAMA` AS `QTY_LAMA`, `t_detail_pembelian`.`ID_SUPPLIER` AS `ID_SUPPLIER`, `m_supplier`.`NAMA` AS `NAMA_SUPPLIER` FROM ((((`t_detail_pembelian` left join `t_pembelian` on(`t_detail_pembelian`.`ID_TRANSAKSI_PEMBELIAN` = `t_pembelian`.`ID`)) left join `m_produk` on(`t_detail_pembelian`.`ID_PRODUK` = `m_produk`.`ID`)) left join `m_supplier` on(`t_detail_pembelian`.`ID_SUPPLIER` = `m_supplier`.`ID`)) left join `m_kategori` on(`m_produk`.`ID_KATEGORI` = `m_kategori`.`ID`)) ;

CREATE OR REPLACE VIEW `view_detail_penjualan`  AS SELECT `t_detail_penjualan`.`ID` AS `ID`, `t_detail_penjualan`.`ID_TRANSAKSI_PENJUALAN` AS `ID_TRANSAKSI_PENJUALAN`, `t_detail_penjualan`.`ID_PRODUK` AS `ID_PRODUK`, `t_detail_penjualan`.`HARGA_BELI` AS `HARGA_BELI`, `t_detail_penjualan`.`HARGA_JUAL` AS `HARGA_JUAL`, `t_detail_penjualan`.`QTY` AS `QTY`, `m_produk`.`NAMA` AS `NAMA_PRODUK`, `t_penjualan`.`TANGGAL` AS `TANGGAL`, `t_penjualan`.`STATUS` AS `STATUS` FROM ((`t_detail_penjualan` join `m_produk` on(`t_detail_penjualan`.`ID_PRODUK` = `m_produk`.`ID`)) join `t_penjualan` on(`t_detail_penjualan`.`ID_TRANSAKSI_PENJUALAN` = `t_penjualan`.`ID`)) ;

CREATE OR REPLACE VIEW `view_detail_retur`  AS SELECT `t_detail_retur`.`ID` AS `ID_DETAIL_RETUR`, `t_detail_retur`.`ID_TRANSAKSI_RETUR` AS `ID_TRANSAKSI_RETUR`, `t_retur`.`NO_NOTA` AS `NO_NOTA`, `t_retur`.`TANGGAL` AS `TANGGAL`, `t_detail_retur`.`ID_PRODUK` AS `ID_PRODUK`, `m_produk`.`NAMA` AS `NAMA_PRODUK`, `t_detail_retur`.`QTY` AS `QTY`, `t_detail_retur`.`QTY_LAMA` AS `QTY_LAMA`, `t_detail_retur`.`ID_SUPPLIER` AS `ID_SUPPLIER`, `m_supplier`.`NAMA` AS `NAMA_SUPPLIER`, `t_detail_retur`.`KETERANGAN` AS `KETERANGAN`, `t_retur`.`STATUS` AS `STATUS` FROM (((`t_detail_retur` left join `m_produk` on(`t_detail_retur`.`ID_PRODUK` = `m_produk`.`ID`)) left join `t_retur` on(`t_detail_retur`.`ID_TRANSAKSI_RETUR` = `t_retur`.`ID`)) left join `m_supplier` on(`t_detail_retur`.`ID_SUPPLIER` = `m_supplier`.`ID`)) ;

CREATE OR REPLACE VIEW `view_kategori`  AS SELECT `m_kategori`.`ID` AS `ID`, `m_kategori`.`DESKRIPSI` AS `NAMA_PRODUK` FROM `m_kategori` ;

CREATE OR REPLACE VIEW `view_pembelian`  AS SELECT `t_pembelian`.`ID` AS `ID_PEMBELIAN`, `t_pembelian`.`NO_NOTA` AS `NO_NOTA`, `t_pembelian`.`TANGGAL` AS `TANGGAL`, `t_pembelian`.`ID_USER` AS `ID_USER`, `m_pengguna`.`NAMA` AS `NAMA_USER`, `t_pembelian`.`STATUS` AS `STATUS` FROM (`t_pembelian` left join `m_pengguna` on(`t_pembelian`.`ID_USER` = `m_pengguna`.`ID`)) ;

CREATE OR REPLACE VIEW `view_penjualan`  AS SELECT `t_penjualan`.`ID` AS `ID`, `t_penjualan`.`TANGGAL` AS `TANGGAL`, `t_penjualan`.`JAM` AS `JAM`, `t_penjualan`.`ID_JENIS_BAYAR` AS `ID_JENIS_BAYAR`, `t_penjualan`.`TOTAL` AS `TOTAL`, `t_penjualan`.`ID_USER` AS `ID_USER`, `t_penjualan`.`KETERANGAN` AS `KETERANGAN`, `m_pengguna`.`NAMA` AS `NAMA_KASIR`, `m_jenis_bayar`.`NAMA` AS `JENIS_BAYAR`, `t_penjualan`.`DISKON` AS `DISKON`, `t_penjualan`.`STATUS` AS `STATUS` FROM ((`t_penjualan` join `m_pengguna` on(`t_penjualan`.`ID_USER` = `m_pengguna`.`ID`)) join `m_jenis_bayar` on(`t_penjualan`.`ID_JENIS_BAYAR` = `m_jenis_bayar`.`ID`)) ;

CREATE OR REPLACE VIEW `view_penyusutan_produk`  AS SELECT `t_penyusutan_produk`.`ID` AS `ID`, `t_penyusutan_produk`.`ID_PRODUK` AS `ID_PRODUK`, `t_penyusutan_produk`.`HARGA_JUAL_AWAL` AS `HARGA_JUAL_AWAL`, `t_penyusutan_produk`.`HARGA_JUAL_AKHIR` AS `HARGA_JUAL_AKHIR`, `t_penyusutan_produk`.`PROSENTASE_PENYUSUTAN` AS `PROSENTASE_PENYUSUTAN`, `t_penyusutan_produk`.`TANGGAL` AS `TANGGAL`, `m_produk`.`NAMA` AS `NAMA` FROM (`t_penyusutan_produk` join `m_produk` on(`t_penyusutan_produk`.`ID_PRODUK` = `m_produk`.`ID`)) ;

CREATE OR REPLACE VIEW `view_produk`  AS SELECT `m_produk`.`ID` AS `ID_PRODUK`, `m_produk`.`NAMA` AS `NAMA_PRODUK`, `m_produk`.`ID_KATEGORI` AS `ID_KATEGORI`, `m_kategori`.`DESKRIPSI` AS `DESKRIPSI_KATEGORI`, `m_produk`.`STOK` AS `STOK`, `m_produk`.`HARGA_BELI` AS `HARGA_BELI`, `m_produk`.`HARGA_JUAL` AS `HARGA_JUAL`, `m_produk`.`BARCODE` AS `BARCODE`, `m_produk`.`FOTO` AS `FOTO` FROM (`m_produk` left join `m_kategori` on(`m_produk`.`ID_KATEGORI` = `m_kategori`.`ID`)) ;

CREATE OR REPLACE VIEW `view_retur`  AS SELECT `t_retur`.`ID` AS `ID_RETUR`, `t_retur`.`NO_NOTA` AS `NO_NOTA`, `t_retur`.`TANGGAL` AS `TANGGAL`, `t_retur`.`ID_USER` AS `ID_USER`, `m_pengguna`.`NAMA` AS `NAMA_USER`, `t_retur`.`STATUS` AS `STATUS` FROM (`t_retur` left join `m_pengguna` on(`t_retur`.`ID_USER` = `m_pengguna`.`ID`)) ;


-- =====================================================================
-- Seed data minimal (akun default & master dasar)
-- =====================================================================
INSERT IGNORE INTO `m_pengguna` (`ID`,`NAMA`,`USERNAME`,`PASSWORD`,`LEVEL`,`TELP`) VALUES
(1,'Administrator','admin','rahasia',1,''),
(2,'Kasir','kasir1','rahasia',2,'');

INSERT IGNORE INTO `m_jenis_bayar` (`ID`,`NAMA`) VALUES (2,'Cash');

INSERT IGNORE INTO `m_kategori` (`ID`,`DESKRIPSI`) VALUES
(2,'Makanan'),(4,'Minuman'),(10,'Stationary');

INSERT IGNORE INTO `m_identitas` (`ID`,`NAMA`,`ALAMAT`,`NO_TELP`,`EMAIL`,`WEBSITE`,`LOGO`) VALUES
(1,'TOKO ZONA KASIR','Jalan Banurejo 26 Kepanjen','082183000993','-','-','');

SET FOREIGN_KEY_CHECKS=1;
