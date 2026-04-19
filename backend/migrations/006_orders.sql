-- ============================================================
-- Migration 006: orders, order_items, order_status_history
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `orders` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_number`          VARCHAR(50)     NOT NULL,
    `user_id`               BIGINT UNSIGNED DEFAULT NULL,
    `source`                ENUM('web','trendyol','hepsiburada','admin') NOT NULL DEFAULT 'web',
    `marketplace_order_id`  VARCHAR(100)    DEFAULT NULL,
    `status`                ENUM('pending','confirmed','preparing','shipped','delivered','cancelled','returned','refunded') NOT NULL DEFAULT 'pending',
    `subtotal`              DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `shipping_cost`         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `discount_amount`       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `tax_amount`            DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `total`                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    -- Coupon
    `coupon_id`             BIGINT UNSIGNED DEFAULT NULL,
    `coupon_code`           VARCHAR(50)     DEFAULT NULL,
    -- Shipping address
    `shipping_first_name`   VARCHAR(100)    DEFAULT NULL,
    `shipping_last_name`    VARCHAR(100)    DEFAULT NULL,
    `shipping_phone`        VARCHAR(20)     DEFAULT NULL,
    `shipping_city`         VARCHAR(100)    DEFAULT NULL,
    `shipping_district`     VARCHAR(100)    DEFAULT NULL,
    `shipping_neighborhood` VARCHAR(100)    DEFAULT NULL,
    `shipping_address_line` TEXT            DEFAULT NULL,
    `shipping_postal_code`  VARCHAR(10)     DEFAULT NULL,
    -- Billing address
    `billing_first_name`    VARCHAR(100)    DEFAULT NULL,
    `billing_last_name`     VARCHAR(100)    DEFAULT NULL,
    `billing_phone`         VARCHAR(20)     DEFAULT NULL,
    `billing_city`          VARCHAR(100)    DEFAULT NULL,
    `billing_district`      VARCHAR(100)    DEFAULT NULL,
    `billing_address_line`  TEXT            DEFAULT NULL,
    `billing_postal_code`   VARCHAR(10)     DEFAULT NULL,
    -- Cargo
    `cargo_company`         VARCHAR(100)    DEFAULT NULL,
    `cargo_tracking_number` VARCHAR(100)    DEFAULT NULL,
    `cargo_tracking_url`    VARCHAR(500)    DEFAULT NULL,
    `shipped_at`            TIMESTAMP       NULL DEFAULT NULL,
    `delivered_at`          TIMESTAMP       NULL DEFAULT NULL,
    -- Payment
    `payment_method`        VARCHAR(50)     DEFAULT NULL,
    `payment_status`        ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    `payment_id`            VARCHAR(100)    DEFAULT NULL,
    `paid_at`               TIMESTAMP       NULL DEFAULT NULL,
    -- Invoice
    `invoice_type`          ENUM('individual','corporate') DEFAULT 'individual',
    `invoice_company_name`  VARCHAR(255)    DEFAULT NULL,
    `invoice_tax_office`    VARCHAR(255)    DEFAULT NULL,
    `invoice_tax_number`    VARCHAR(50)     DEFAULT NULL,
    -- Notes
    `notes`                 TEXT            DEFAULT NULL,
    `created_at`            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_orders_order_number` (`order_number`),
    KEY `idx_orders_user_id` (`user_id`),
    KEY `idx_orders_status` (`status`),
    KEY `idx_orders_source` (`source`),
    KEY `idx_orders_created_at` (`created_at`),
    CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `order_items` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`      BIGINT UNSIGNED NOT NULL,
    `product_id`    BIGINT UNSIGNED DEFAULT NULL,
    `variant_id`    BIGINT UNSIGNED DEFAULT NULL,
    `product_name`  VARCHAR(500)    NOT NULL,
    `product_sku`   VARCHAR(100)    DEFAULT NULL,
    `product_image` VARCHAR(500)    DEFAULT NULL,
    `quantity`      INT UNSIGNED    NOT NULL DEFAULT 1,
    `unit_price`    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `total_price`   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `tax_rate`      DECIMAL(5,2)    NOT NULL DEFAULT 20.00,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_order_items_order_id` (`order_id`),
    KEY `idx_order_items_product_id` (`product_id`),
    CONSTRAINT `fk_order_items_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders` (`id`)   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `order_status_history` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`    BIGINT UNSIGNED NOT NULL,
    `old_status`  VARCHAR(50)     DEFAULT NULL,
    `new_status`  VARCHAR(50)     NOT NULL,
    `note`        TEXT            DEFAULT NULL,
    `changed_by`  VARCHAR(100)    DEFAULT NULL,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_order_status_history_order_id` (`order_id`),
    CONSTRAINT `fk_osh_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
