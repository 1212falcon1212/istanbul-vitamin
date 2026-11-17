ALTER TABLE orders
 ADD COLUMN payment_status VARCHAR(24) DEFAULT 'pending',
 ADD COLUMN payment_card_last_four VARCHAR(4) NULL,
 ADD COLUMN receipt_submitted_at DATETIME(3) NULL,
 ADD COLUMN payment_confirmed_at DATETIME(3) NULL;
UPDATE orders SET payment_status = CASE WHEN payment_id LIKE 'DEV-%' THEN 'test' ELSE 'paid' END WHERE payment_id IS NOT NULL AND payment_id <> '';
CREATE TABLE order_receipts (
 order_id BIGINT UNSIGNED PRIMARY KEY,
 data MEDIUMBLOB NOT NULL,
 content_type VARCHAR(50) NOT NULL,
 updated_at DATETIME(3) NULL,
 CONSTRAINT fk_order_receipts_order FOREIGN KEY (order_id) REFERENCES orders(id)
);
