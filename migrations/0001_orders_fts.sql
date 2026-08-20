-- 0001_orders_fts.sql
-- Full-text search index over the orders table using FTS5.
-- Standalone (non-external-content) FTS5 table storing order_id + searchable text,
-- kept in sync via triggers on the orders table using the implicit SQLite rowid.
-- Safe to re-run: drops and recreates the FTS artifacts, then backfills.

-- Drop existing FTS artifacts if present (idempotent).
DROP TRIGGER IF EXISTS orders_fts_insert;
DROP TRIGGER IF EXISTS orders_fts_delete;
DROP TRIGGER IF EXISTS orders_fts_update;
DROP TABLE IF EXISTS orders_fts;

CREATE VIRTUAL TABLE orders_fts USING fts5(
    order_id UNINDEXED,
    order_number,
    customer_name,
    product_name,
    variant,
    notes,
    print_name,
    status,
    tokenize = 'porter unicode61'
);

CREATE TRIGGER orders_fts_insert AFTER INSERT ON orders BEGIN
    INSERT INTO orders_fts(rowid, order_id, order_number, customer_name, product_name, variant, notes, print_name, status)
    VALUES (new.rowid, new.id, new.order_number, new.customer_name, new.product_name, new.variant, new.notes, new.print_name, new.status);
END;

CREATE TRIGGER orders_fts_delete AFTER DELETE ON orders BEGIN
    DELETE FROM orders_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER orders_fts_update AFTER UPDATE ON orders BEGIN
    DELETE FROM orders_fts WHERE rowid = old.rowid;
    INSERT INTO orders_fts(rowid, order_id, order_number, customer_name, product_name, variant, notes, print_name, status)
    VALUES (new.rowid, new.id, new.order_number, new.customer_name, new.product_name, new.variant, new.notes, new.print_name, new.status);
END;

-- Backfill from existing orders.
INSERT INTO orders_fts(rowid, order_id, order_number, customer_name, product_name, variant, notes, print_name, status)
SELECT rowid, id, order_number, customer_name, product_name, variant, notes, print_name, status FROM orders;
