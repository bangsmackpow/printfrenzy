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
    theme TEXT DEFAULT 'light',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    order_number TEXT,
    user_email TEXT,
    action_type TEXT,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

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

CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    stage TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, stage)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    order_id TEXT,
    order_number TEXT,
    customer_name TEXT,
    product_name TEXT,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    moved_by TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);