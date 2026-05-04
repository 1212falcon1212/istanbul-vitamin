-- Eski schema'ya sahip prod ortamlarında products(name, short_description)
-- FULLTEXT index'i eksik olduğu için /api/v1/search 500 dönüyordu.
-- Bu migration index'i conditional olarak ekler — varsa noop.

SET @ix := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND INDEX_NAME = 'ft_products_name_desc'
);

SET @sql := IF(
  @ix = 0,
  'ALTER TABLE products ADD FULLTEXT KEY ft_products_name_desc (name, short_description)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
