-- Add source_order_number to preserve the original Wix order number when CSV imports
-- assign the user-provided batch name to order_number. Enables dedup of future exports.
ALTER TABLE orders ADD COLUMN source_order_number TEXT;