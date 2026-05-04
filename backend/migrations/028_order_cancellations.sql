-- ============================================================
-- Migration 028: Sipariş iptal/iade akışı
-- Müşteri self-servis iptal/iade talepleri burada izlenir.
-- orders.status enum'u kirletilmeden ek state machine taşınır.
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `order_cancellations` (
    `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`               BIGINT UNSIGNED NOT NULL,
    `type`                   ENUM('cancel','return') NOT NULL,
    `status`                 ENUM('requested','approved','rejected','completed') NOT NULL DEFAULT 'requested',
    `reason`                 VARCHAR(80) NOT NULL,
    `note`                   TEXT NULL,
    `refund_amount`          DECIMAL(10,2) NULL,
    `refund_status`          ENUM('pending','processing','completed','failed') NULL,
    `paytr_refund_id`        VARCHAR(64) NULL,
    `aras_return_tracking`   VARCHAR(100) NULL,
    `requested_by_user_id`   BIGINT UNSIGNED NULL,
    `decided_by_admin_id`    BIGINT UNSIGNED NULL,
    `decided_at`             DATETIME NULL,
    `created_at`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_order_cancel_status` (`order_id`, `status`),
    INDEX `idx_user_cancel` (`requested_by_user_id`, `created_at`),
    INDEX `idx_cancel_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
