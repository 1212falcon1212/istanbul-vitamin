-- ============================================================
-- Migration 027: Aras Kargo entegrasyonu (idempotent)
-- - orders'a 7 yeni kolon (var olanları atlar)
-- - aras_shipment_logs tablosu
-- - aras_kargo + contact ek ayarları
-- ============================================================

-- UP

-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS MySQL 8.0.29+ özel; biz INFORMATION_SCHEMA üzerinden
-- prosedürel olarak ekliyoruz ki hem 5.7 hem 8.x'te idempotent çalışsın.

DROP PROCEDURE IF EXISTS aras_add_orders_column;
DELIMITER $$
CREATE PROCEDURE aras_add_orders_column(IN col_name VARCHAR(64), IN col_def TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND COLUMN_NAME = col_name
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `orders` ADD COLUMN ', col_def);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL aras_add_orders_column('aras_integration_code',  '`aras_integration_code` VARCHAR(32) NULL AFTER `tracking_number`');
CALL aras_add_orders_column('aras_status_code',       '`aras_status_code` TINYINT NULL AFTER `delivered_at`');
CALL aras_add_orders_column('aras_status_text',       '`aras_status_text` VARCHAR(64) NULL AFTER `aras_status_code`');
CALL aras_add_orders_column('aras_status_checked_at', '`aras_status_checked_at` DATETIME NULL AFTER `aras_status_text`');
CALL aras_add_orders_column('aras_parcel_count',      '`aras_parcel_count` TINYINT UNSIGNED NULL DEFAULT 1 AFTER `aras_status_checked_at`');
CALL aras_add_orders_column('aras_cancel_attempted_at', '`aras_cancel_attempted_at` DATETIME NULL AFTER `aras_parcel_count`');
CALL aras_add_orders_column('aras_cancel_succeeded',  '`aras_cancel_succeeded` TINYINT(1) NULL AFTER `aras_cancel_attempted_at`');

DROP PROCEDURE aras_add_orders_column;

-- Index'leri de idempotent ekle.
DROP PROCEDURE IF EXISTS aras_ensure_index;
DELIMITER $$
CREATE PROCEDURE aras_ensure_index(IN idx_name VARCHAR(64), IN idx_def TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND INDEX_NAME = idx_name
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `orders` ADD ', idx_def);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL aras_ensure_index('uniq_orders_aras_integration_code', 'UNIQUE KEY `uniq_orders_aras_integration_code` (`aras_integration_code`)');
CALL aras_ensure_index('idx_orders_aras_poll',              'INDEX `idx_orders_aras_poll` (`status`, `aras_status_code`, `tracking_number`)');

DROP PROCEDURE aras_ensure_index;

CREATE TABLE IF NOT EXISTS `aras_shipment_logs` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`     BIGINT UNSIGNED NOT NULL,
    `op`           VARCHAR(40) NOT NULL,
    `request_xml`  MEDIUMTEXT NULL,
    `response_xml` MEDIUMTEXT NULL,
    `status_code`  VARCHAR(16) NULL,
    `error`        VARCHAR(500) NULL,
    `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_aras_logs_order` (`order_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`key`, `value`, `group`, `created_at`, `updated_at`) VALUES
    ('aras.enabled',           'false',          'aras_kargo', NOW(), NOW()),
    ('aras.test_mode',         'true',           'aras_kargo', NOW(), NOW()),
    ('aras.username',          'neodyum',        'aras_kargo', NOW(), NOW()),
    ('aras.password',          'nd2580',         'aras_kargo', NOW(), NOW()),
    ('aras.customer_code',     '1932448851342',  'aras_kargo', NOW(), NOW()),
    ('aras.sender_address_id', '',               'aras_kargo', NOW(), NOW()),
    ('aras.payor_type_code',   '1',              'aras_kargo', NOW(), NOW()),
    ('aras.parcel_kg_limit',   '30',             'aras_kargo', NOW(), NOW()),
    ('city',                   '',               'contact',    NOW(), NOW()),
    ('town',                   '',               'contact',    NOW(), NOW()),
    ('sender_name',            '',               'contact',    NOW(), NOW())
ON DUPLICATE KEY UPDATE `group` = VALUES(`group`), `updated_at` = NOW();
