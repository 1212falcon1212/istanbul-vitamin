-- ============================================================
-- Migration 002: addresses, saved_cards
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `addresses` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       BIGINT UNSIGNED NOT NULL,
    `title`         VARCHAR(100)    NOT NULL,
    `first_name`    VARCHAR(100)    NOT NULL,
    `last_name`     VARCHAR(100)    NOT NULL,
    `phone`         VARCHAR(20)     NOT NULL,
    `city`          VARCHAR(100)    NOT NULL,
    `district`      VARCHAR(100)    NOT NULL,
    `neighborhood`  VARCHAR(100)    DEFAULT NULL,
    `address_line`  TEXT            NOT NULL,
    `postal_code`   VARCHAR(10)     DEFAULT NULL,
    `is_default`    TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_addresses_user_id` (`user_id`),
    CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `saved_cards` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT UNSIGNED NOT NULL,
    `card_label`      VARCHAR(100)    DEFAULT NULL,
    `card_last_four`  CHAR(4)         NOT NULL,
    `card_token`      VARCHAR(500)    NOT NULL,
    `card_brand`      VARCHAR(50)     DEFAULT NULL,
    `is_default`      TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_saved_cards_user_id` (`user_id`),
    CONSTRAINT `fk_saved_cards_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
