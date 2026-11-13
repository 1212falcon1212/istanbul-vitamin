-- Older development databases received these fields through GORM AutoMigrate.
-- Fresh SQL-only installs need them before migration 021 references invoice_url.
-- Existing installations may already have the columns, so add only missing ones.
DROP PROCEDURE IF EXISTS ensure_order_invoice_field;
DELIMITER $$
CREATE PROCEDURE ensure_order_invoice_field(IN field_name VARCHAR(64), IN field_type VARCHAR(100))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = field_name
    ) THEN
        SET @invoice_ddl = CONCAT('ALTER TABLE `orders` ADD COLUMN `', field_name, '` ', field_type);
        PREPARE invoice_stmt FROM @invoice_ddl;
        EXECUTE invoice_stmt;
        DEALLOCATE PREPARE invoice_stmt;
    END IF;
END$$
DELIMITER ;
CALL ensure_order_invoice_field('bizim_hesap_invoice_id', 'VARCHAR(100) DEFAULT NULL');
CALL ensure_order_invoice_field('invoice_number', 'VARCHAR(50) DEFAULT NULL');
CALL ensure_order_invoice_field('invoice_url', 'VARCHAR(500) DEFAULT NULL');
DROP PROCEDURE ensure_order_invoice_field;
