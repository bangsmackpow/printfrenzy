-- schema.sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT,
    customer_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant TEXT,
    image_url TEXT NOT NULL, -- Wix URL or R2 URL
    status TEXT DEFAULT 'ORDERED', -- 'ORDERED', 'PRINTED', 'COMPLETED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    user_email TEXT,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);