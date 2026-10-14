-- 0004_priority.sql
-- Priority tagging at two scopes:
--   * item level  -> columns on orders (is_priority, priority_by, priority_at, priority_note)
--   * batch level -> the batch_priorities table, keyed by order_number
-- A batch counts as priority when its batch flag is set OR any of its items is priority.
-- Priority columns are intentionally NOT part of FTS; no FTS changes are required.

ALTER TABLE orders ADD COLUMN is_priority INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN priority_by TEXT;
ALTER TABLE orders ADD COLUMN priority_at DATETIME;
ALTER TABLE orders ADD COLUMN priority_note TEXT;

CREATE TABLE IF NOT EXISTS batch_priorities (
    order_number TEXT PRIMARY KEY,
    is_priority INTEGER DEFAULT 0,
    priority_by TEXT,
    priority_at DATETIME,
    priority_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_is_priority ON orders (is_priority);
