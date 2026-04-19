-- ============================================================
-- Migration 020: Sipariş durumları basitleştirildi
-- pending → shipped → delivered (3 katmanlı akış)
-- cancelled sadece pending'den, refunded yalnızca shipped/delivered'dan
-- ============================================================

-- UP

-- Mevcut satırları yeni durum kümesine normalize et.
UPDATE `orders` SET `status` = 'pending'  WHERE `status` IN ('paid', 'preparing', 'confirmed');
UPDATE `orders` SET `status` = 'refunded' WHERE `status` = 'returned';

-- Enum'ı daralt.
ALTER TABLE `orders`
    MODIFY COLUMN `status`
    ENUM('pending', 'shipped', 'delivered', 'cancelled', 'refunded')
    NOT NULL DEFAULT 'pending';
