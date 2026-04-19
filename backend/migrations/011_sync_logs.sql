-- ============================================================
-- Migration 011: sync_logs
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `sync_logs` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `marketplace`   ENUM('trendyol','hepsiburada') NOT NULL,
    `sync_type`     ENUM('products','orders','stock','price') NOT NULL,
    `status`        ENUM('running','completed','failed') NOT NULL DEFAULT 'running',
    `total_items`   INT UNSIGNED    NOT NULL DEFAULT 0,
    `success_count` INT UNSIGNED    NOT NULL DEFAULT 0,
    `error_count`   INT UNSIGNED    NOT NULL DEFAULT 0,
    `error_details` JSON            DEFAULT NULL,
    `started_at`    TIMESTAMP       NULL DEFAULT NULL,
    `completed_at`  TIMESTAMP       NULL DEFAULT NULL,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sync_logs_marketplace_type` (`marketplace`, `sync_type`),
    KEY `idx_sync_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
