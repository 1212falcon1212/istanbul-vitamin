-- ============================================================
-- Migration 021: Bizimhesap fatura retry alanları
-- Shipped geçişinde tetiklenen fatura çağrısının yeniden denenmesi için
-- sayacı ve son hata mesajını tutar.
-- ============================================================

-- UP

ALTER TABLE `orders`
    ADD COLUMN `invoice_retry_count` INT NOT NULL DEFAULT 0 AFTER `invoice_url`,
    ADD COLUMN `last_invoice_error` VARCHAR(500) DEFAULT NULL AFTER `invoice_retry_count`;

CREATE INDEX `idx_orders_invoice_pending`
    ON `orders` (`status`, `invoice_retry_count`);
