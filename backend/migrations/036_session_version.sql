SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'session_version'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN session_version BIGINT UNSIGNED NOT NULL DEFAULT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'admins' AND column_name = 'session_version'), 'SELECT 1', 'ALTER TABLE admins ADD COLUMN session_version BIGINT UNSIGNED NOT NULL DEFAULT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
