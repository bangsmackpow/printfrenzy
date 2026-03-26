-- schema.sql
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT,
    customer_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant TEXT,
    image_url TEXT NOT NULL, -- Wix URL or R2 URL
    status TEXT DEFAULT 'ORDERED', -- 'ORDERED', 'PRINTED', 'COMPLETED'
    ordered_at TEXT, -- Original order date from CSV
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    print_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'USER', -- 'ADMIN', 'USER'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    user_email TEXT,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    customer_name TEXT,
    street TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    tracking_number TEXT,
    label_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);