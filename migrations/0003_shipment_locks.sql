-- Atomic guard to serialize shipping-label purchases per order and prevent
-- double real-money Shippo charges from concurrent requests / a bypassed rate
-- limiter. The INSERT into this PRIMARY KEY is the claim; it is released (deleted)
-- once the purchase completes. Stale claims are reclaimed after 90s.
CREATE TABLE IF NOT EXISTS shipment_locks (
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_number, customer_name)
);
