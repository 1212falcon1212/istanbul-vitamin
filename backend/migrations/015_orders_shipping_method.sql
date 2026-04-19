-- Migration 015: orders.shipping_method
-- Frontend ödeme akışındaki kargo seçimi (standard / express) kaydedilsin.

ALTER TABLE `orders`
    ADD COLUMN `shipping_method` VARCHAR(50) NOT NULL DEFAULT 'standard' AFTER `shipping_cost`;
