ALTER TABLE orders ADD COLUMN notes TEXT;
ALTER TABLE orders ADD COLUMN print_name TEXT;

CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    order_number TEXT,
    customer_name TEXT,
    street TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    tracking_number TEXT,
    label_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
