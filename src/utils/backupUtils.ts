export interface OrderArchive {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  image_url: string;
  status: string;
  ordered_at: string;
  quantity: number;
  completed_at: string;
  audit_history: unknown[];
}

export async function archiveOrderToR2(db: D1Database, bucket: R2Bucket, orderId: string) {
  try {
    const orderResult = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
    if (!orderResult) return;

    const order = orderResult as Record<string, unknown>;

    const auditLogs = await db.prepare("SELECT * FROM audit_logs WHERE order_id = ? ORDER BY timestamp ASC")
      .bind(orderId)
      .all();

    const archiveData: OrderArchive = {
      id: String(order.id),
      order_number: String(order.order_number || ""),
      customer_name: String(order.customer_name),
      product_name: String(order.product_name),
      variant: String(order.variant || ""),
      image_url: String(order.image_url),
      status: String(order.status),
      ordered_at: String(order.ordered_at),
      quantity: Number(order.quantity),
      completed_at: new Date().toISOString(),
      audit_history: auditLogs.results
    };

    const key = `backups/orders/${order.order_number || 'manual'}/${orderId}.json`;
    await bucket.put(key, JSON.stringify(archiveData, null, 2), {
      customMetadata: {
        order_number: String(order.order_number || 'unknown'),
        customer_name: String(order.customer_name)
      }
    } as any); 

    console.log("Archived order to R2:", { orderId, key });
  } catch (error) {
    console.error("Failed to archive order to R2:", { orderId, error });
  }
}

export async function createFullDatabaseBackup(db: D1Database, bucket: R2Bucket) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup: Record<string, unknown> = {};

    const tables = ['orders', 'audit_logs'];

    for (const table of tables) {
      const data = await db.prepare(`SELECT * FROM ${table}`).all();
      backup[table] = data.results;
    }

    const usersData = await db.prepare("SELECT id, email, role, theme, created_at FROM users").all();
    backup.users = usersData.results;

    const key = `backups/sql-nightly/db-backup-${timestamp}.json`;
    await bucket.put(key, JSON.stringify(backup, null, 2), {
      httpMetadata: { contentType: 'application/json' }
    } as any);

    return { key, tableCount: tables.length };
  } catch (error) {
    console.error("Full database backup failed:", { error });
    throw error;
  }
}
