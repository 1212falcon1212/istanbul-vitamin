-- Migration 013: password_resets
-- Şifre sıfırlama token'ları (tek kullanımlık, zaman aşımlı)

CREATE TABLE IF NOT EXISTS `password_resets` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`     BIGINT UNSIGNED NOT NULL,
    `token_hash`  VARCHAR(255)    NOT NULL,
    `expires_at`  TIMESTAMP       NOT NULL,
    `used_at`     TIMESTAMP       NULL DEFAULT NULL,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_password_resets_user` (`user_id`),
    INDEX `idx_password_resets_token` (`token_hash`),
    INDEX `idx_password_resets_expires` (`expires_at`),
    CONSTRAINT `fk_password_resets_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
