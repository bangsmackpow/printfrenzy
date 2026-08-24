-- schema.sql
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT,
    source_order_number TEXT,
    customer_name TEXT,
    product_name TEXT,
    variant TEXT,
    image_url TEXT,
    image_url2 TEXT,
    image_url3 TEXT,
    image_url4 TEXT,
    status TEXT DEFAULT 'RECEIVED',
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    print_name TEXT,
    ordered_at DATETIME,
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

CREATE INDEX IF NOT EXISTS idx_notifications_poll ON notifications (user_email, read, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs (user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_order_id ON audit_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_number ON shipments (order_number);

CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT,
    endpoint TEXT,
    timestamp INTEGER,
    PRIMARY KEY (ip, endpoint, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp ON rate_limits (timestamp);