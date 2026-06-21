-- =====================================================================
-- CONTOH DATA Varian/Modifier untuk MERCHANT_ID = 1
-- Jalankan MANUAL setelah modifier-2026-06-21.sql.
-- Aman dijalankan berulang (ada pengecekan NOT EXISTS, tidak dobel).
-- Ganti @mid bila ingin merchant lain.
-- =====================================================================
SET @mid := 1;

-- ---------------------------------------------------------------------
-- 1) GRUP: Ukuran (pilih satu, wajib), Topping (pilih banyak), Level Gula (pilih satu)
-- ---------------------------------------------------------------------
INSERT INTO `m_modifier_group` (`NAMA`,`TIPE`,`WAJIB`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT 'Ukuran','SINGLE',1,@mid,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM `m_modifier_group` WHERE `NAMA`='Ukuran' AND `MERCHANT_ID`=@mid);

INSERT INTO `m_modifier_group` (`NAMA`,`TIPE`,`WAJIB`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT 'Topping','MULTI',0,@mid,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM `m_modifier_group` WHERE `NAMA`='Topping' AND `MERCHANT_ID`=@mid);

INSERT INTO `m_modifier_group` (`NAMA`,`TIPE`,`WAJIB`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT 'Level Gula','SINGLE',0,@mid,NOW(),NOW()
WHERE NOT EXISTS (SELECT 1 FROM `m_modifier_group` WHERE `NAMA`='Level Gula' AND `MERCHANT_ID`=@mid);

-- ---------------------------------------------------------------------
-- 2) OPSI tiap grup (HARGA = tambahan). ID_GROUP diambil via subquery.
-- ---------------------------------------------------------------------
-- Helper: insert opsi bila belum ada.
-- Ukuran
INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Reguler',0,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Ukuran' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Reguler');

INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Large',5000,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Ukuran' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Large');

-- Topping
INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Boba',5000,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Topping' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Boba');

INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Extra Shot',6000,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Topping' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Extra Shot');

INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Cheese Foam',7000,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Topping' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Cheese Foam');

-- Level Gula (semua +0)
INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Normal',0,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Level Gula' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Normal');

INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'Less Sugar',0,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Level Gula' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='Less Sugar');

INSERT INTO `m_modifier_option` (`ID_GROUP`,`NAMA`,`HARGA`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT g.`ID`,'No Sugar',0,@mid,NOW(),NOW() FROM `m_modifier_group` g
WHERE g.`NAMA`='Level Gula' AND g.`MERCHANT_ID`=@mid
  AND NOT EXISTS (SELECT 1 FROM `m_modifier_option` o WHERE o.`ID_GROUP`=g.`ID` AND o.`NAMA`='No Sugar');

-- ---------------------------------------------------------------------
-- 3) PASANG grup ke produk milik merchant 1.
--    GANTI daftar nama produk di IN (...) sesuai produk minuman Anda.
--    Contoh ini memasang Ukuran + Topping + Level Gula.
-- ---------------------------------------------------------------------
INSERT INTO `m_produk_modifier` (`ID_PRODUK`,`ID_GROUP`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
SELECT p.`ID`, g.`ID`, @mid, NOW(), NOW()
FROM `m_produk` p
JOIN `m_modifier_group` g ON g.`MERCHANT_ID`=@mid AND g.`NAMA` IN ('Ukuran','Topping','Level Gula')
WHERE p.`MERCHANT_ID`=@mid
  AND p.`NAMA` IN ('Frisian Flag','Hydro Coco')   -- <- ganti dengan produk minuman Anda
  AND NOT EXISTS (
    SELECT 1 FROM `m_produk_modifier` pm WHERE pm.`ID_PRODUK`=p.`ID` AND pm.`ID_GROUP`=g.`ID`
  );

-- =====================================================================
-- Alternatif: pasang otomatis ke SEMUA produk pada kategori "Minuman"
-- (hapus komentar bila ingin pakai cara ini, dan pastikan kategori bernama 'Minuman').
-- =====================================================================
-- INSERT INTO `m_produk_modifier` (`ID_PRODUK`,`ID_GROUP`,`MERCHANT_ID`,`CREATED_AT`,`UPDATED_AT`)
-- SELECT p.`ID`, g.`ID`, @mid, NOW(), NOW()
-- FROM `m_produk` p
-- JOIN `m_kategori` k ON k.`ID`=p.`ID_KATEGORI` AND k.`MERCHANT_ID`=@mid AND k.`DESKRIPSI`='Minuman'
-- JOIN `m_modifier_group` g ON g.`MERCHANT_ID`=@mid AND g.`NAMA` IN ('Ukuran','Topping','Level Gula')
-- WHERE p.`MERCHANT_ID`=@mid
--   AND NOT EXISTS (SELECT 1 FROM `m_produk_modifier` pm WHERE pm.`ID_PRODUK`=p.`ID` AND pm.`ID_GROUP`=g.`ID`);
