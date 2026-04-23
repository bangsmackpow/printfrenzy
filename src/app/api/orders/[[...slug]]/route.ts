import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";

export const runtime = 'edge';

const ALLOWED_STATUSES = ['RECEIVED', 'ORDERING', 'PRINTING', 'STAGING', 'PRODUCTION', 'COMPLETED', 'ARCHIVED'] as const;
const MAX_BULK_IDS = 500;
const MAX_CSV_SIZE = 5 * 1024 * 1024;
const MAX_CSV_RECORDS = 10000;

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const parseLine = (line: string) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur.trim().replace(/^"|"$/g, ''));
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = values[i] || "";
    });
    return record;
  });
}

async function sanitizeError(e: unknown, context: Record<string, any> = {}): Promise<NextResponse> {
  const message = e instanceof Error ? e.message : "Unknown error";
  await log.error("Orders API failure", { error: message, ...context });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function isValidHttpsUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (slug?.[0] === 'details') {
    const orderNumber = searchParams.get('order_number');
    try {
      if (orderNumber) {
        const results = await db.prepare("SELECT * FROM orders WHERE order_number = ? ORDER BY customer_name ASC").bind(orderNumber).all();
        return NextResponse.json(results.results);
      } else {
        const results = await db.prepare("SELECT * FROM orders WHERE status = 'PRINTING' ORDER BY order_number DESC, customer_name ASC").all();
        return NextResponse.json(results.results);
      }
    } catch (e: unknown) { return sanitizeError(e, { slug, orderNumber }); }
  }

  if (slug?.[0] === 'single') {
    const id = searchParams.get('id');
    try {
      if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
      const result = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
      return NextResponse.json(result);
    } catch (e: unknown) { return sanitizeError(e, { slug, id }); }
  }

  try {
    const results = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return NextResponse.json(results.results);
  } catch (e: unknown) { return sanitizeError(e, { slug }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  const userEmail = session?.user?.email || "unknown";
  const apiKey = req.headers.get("x-api-key");
  const validApiKey = process.env.API_IMPORT_KEY;
  
  let authorized = !!session;
  if (!authorized && slug?.[0] === 'import' && apiKey && validApiKey) {
    authorized = constantTimeCompare(apiKey, validApiKey);
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (slug?.[0] === 'import') {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const batchName = formData.get('batch_name') as string || "";
        
        if (!file) {
          await log.warn("CSV Import failed: No file", { user: userEmail });
          return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        await log.info("CSV Import started", { user: userEmail, filename: file.name, size: file.size, batchName });

        if (file.size > MAX_CSV_SIZE) {
          await log.warn("CSV Import rejected: File too large", { user: userEmail, size: file.size });
          return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        const text = await file.text();
        const records = parseCSV(text);
        
        if (records.length > MAX_CSV_RECORDS) {
          await log.warn("CSV Import rejected: Too many records", { user: userEmail, count: records.length });
          return NextResponse.json({ error: `Too many records (max ${MAX_CSV_RECORDS})` }, { status: 400 });
        }

        let count = 0;
        for (const record of records) {
            const wixOrderNum = record['Order number'] || record['Order ID'] || record['order_number'];
            const customerName = record['Customer name'] || record['Billing Name'] || record['customer_name'] || 'Unknown';
            const productName = record['Product name'] || record['Lineitem name'] || record['product_name'] || 'Product';
            const variant = (record['Product variant'] || record['Lineitem options'] || record['variant'] || '').trim();
            const imageUrl = record['Product image'] || record['Lineitem image URL'] || record['image_url'];
            const orderedAt = record['Date'] || record['ordered_at'];
            const qty = parseInt(record['Quantity'] || '1', 10) || 1;

            if (imageUrl) {
                await db.prepare("INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, ordered_at, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED')")
                    .bind(crypto.randomUUID(), batchName || wixOrderNum || "IMPORT", customerName, productName, variant, imageUrl, orderedAt, qty).run();
                count++;
            }
        }
        
        await log.info("CSV Import successful", { user: userEmail, imported: count, total: records.length });
        return NextResponse.json({ count });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }


  if (slug?.[0] === 'bulk-status') {
    try {
      const { orderIds, status } = await req.json();
      if (!Array.isArray(orderIds) || orderIds.length === 0) return NextResponse.json({ error: "Invalid orderIds" }, { status: 400 });
      
      await log.info("Bulk status update started", { user: userEmail, count: orderIds.length, targetStatus: status });

      if (orderIds.length > MAX_BULK_IDS) return NextResponse.json({ error: `Too many items (max ${MAX_BULK_IDS})` }, { status: 400 });
      if (!ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

      const placeholders = orderIds.map(() => '?').join(',');
      const existingOrders = await db.prepare(`SELECT id, order_number, customer_name, product_name, status FROM orders WHERE id IN (${placeholders})`).bind(...orderIds).all();
      await db.prepare(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`).bind(status, ...orderIds).run();
      
      const subscribers = await db.prepare("SELECT user_email FROM notification_subscriptions WHERE stage = ?").bind(status).all();
      const subscribersList = (subscribers.results as { user_email: string }[]).map(s => s.user_email);
      
      for (const order of (existingOrders.results as { id: string; order_number: string; customer_name: string; product_name: string; status: string }[])) {
        await db.prepare("INSERT INTO audit_logs (order_id, order_number, user_email, action_type, action, details) VALUES (?, ?, ?, 'STATUS_CHANGE', ?, ?)")
          .bind(order.id, order.order_number, userEmail, `Status: ${order.status} → ${status}`, JSON.stringify({ from: order.status, to: status })).run();
        
        for (const subEmail of subscribersList) {
          if (subEmail !== userEmail) {
            await db.prepare("INSERT INTO notifications (user_email, order_id, order_number, customer_name, product_name, from_stage, to_stage, moved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
              .bind(subEmail, order.id, order.order_number, order.customer_name, order.product_name, order.status, status, userEmail).run();
          }
        }
      }
      
      await log.info("Bulk status update successful", { user: userEmail, count: orderIds.length });
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }

  if (slug?.[0] === 'status') {
    try {
      const { id, status } = await req.json();
      if (!id || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

      const existing = await db.prepare("SELECT order_number, status, customer_name, product_name FROM orders WHERE id = ?").bind(id).first() as { order_number: string; status: string; customer_name: string; product_name: string } | null;
      await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
      
      if (existing) {
        await db.prepare("INSERT INTO audit_logs (order_id, order_number, user_email, action_type, action, details) VALUES (?, ?, ?, 'STATUS_CHANGE', ?, ?)")
          .bind(id, existing.order_number, userEmail, `Status: ${existing.status} → ${status}`, JSON.stringify({ from: existing.status, to: status })).run();
        
        const subscribers = await db.prepare("SELECT user_email FROM notification_subscriptions WHERE stage = ?").bind(status).all();
        const subscribersList = (subscribers.results as { user_email: string }[]).map(s => s.user_email);
        
        for (const subEmail of subscribersList) {
          if (subEmail !== userEmail) {
            await db.prepare("INSERT INTO notifications (user_email, order_id, order_number, customer_name, product_name, from_stage, to_stage, moved_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
              .bind(subEmail, id, existing.order_number, existing.customer_name, existing.product_name, existing.status, status, userEmail).run();
          }
        }
      }
      
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }

  if (slug?.[0] === 'update-notes') {
    try {
      const { order_number, notes } = await req.json();
      const existing = await db.prepare("SELECT id, notes FROM orders WHERE order_number = ?").bind(order_number).first() as { id: string; notes: string } | null;
      await db.prepare("UPDATE orders SET notes = ? WHERE order_number = ?").bind(notes, order_number).run();
      
      if (existing) {
        await db.prepare("INSERT INTO audit_logs (order_id, order_number, user_email, action_type, action, details) VALUES (?, ?, ?, 'NOTES_UPDATE', 'Notes updated', ?)")
          .bind(existing.id, order_number, userEmail, JSON.stringify({ from: existing.notes, to: notes })).run();
      }
      
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }

  if (slug?.[0] === 'update-item') {
    try {
      const { id, print_name } = await req.json();
      await db.prepare("UPDATE orders SET print_name = ? WHERE id = ?").bind(print_name, id).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }

  if (slug?.[0] === 'sync') {
    const WIX_API_KEY = process.env.WIX_API_KEY;
    const WIX_SITE_ID = process.env.WIX_SITE_ID;

    if (!WIX_API_KEY || !WIX_SITE_ID) {
      await log.error("Wix Sync failed: Missing credentials", { user: userEmail });
      return NextResponse.json({ error: "Missing Wix environment variables" }, { status: 500 });
    }

    try {
        await log.info("Wix API Sync started", { user: userEmail });
        let addedCount = 0;
        let skippedCount = 0;
        let cursor: string | null = null;
        const maxPages = 5;
        let pageCount = 0;

        while (pageCount < maxPages) {
            const paging: Record<string, unknown> = { limit: 50 };
            if (cursor) paging.cursor = cursor;

            const wRes = await fetch('https://www.wixapis.com/stores/v2/orders/query', {
                method: 'POST',
                headers: {
                    'Authorization': WIX_API_KEY,
                    'wix-site-id': WIX_SITE_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: {
                        filter: { "status": "PAID" },
                        sort: [{ "field": "number", "order": "DESC" }],
                        paging
                    }
                })
            });

            if (!wRes.ok) {
                const errText = await wRes.text();
                await log.error("Wix API returned error", { status: wRes.status, body: errText, user: userEmail });
                return NextResponse.json({ error: "Failed to sync with Wix" }, { status: wRes.status });
            }

            const data = await wRes.json();
            const orders = data.orders || [];

            for (const order of orders) {
                const orderNumber = order.number.toString();
                const customerName = (order.billingInfo?.address?.fullName || order.billingInfo?.contactDetails?.firstName + " " + order.billingInfo?.contactDetails?.lastName || "Unknown").toUpperCase();
                
                for (const item of (order.lineItems || [])) {
                    const productName = (item.name || "Product").toUpperCase();
                    const variant = (item.description || "").trim().toUpperCase();
                    const imageUrl = item.image;
                    const qty = item.quantity || 1;
                    const orderedAt = order._createdDate;

                    const existing = await db.prepare("SELECT id FROM orders WHERE order_number = ? AND customer_name = ? AND product_name = ? AND variant = ? AND quantity = ?")
                        .bind(orderNumber, customerName, productName, variant, qty).first();

                    if (existing) {
                        skippedCount++;
                        continue;
                    }

                    if (imageUrl) {
                        await db.prepare("INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, ordered_at, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED')")
                            .bind(crypto.randomUUID(), orderNumber, customerName, productName, variant, imageUrl, orderedAt, qty).run();
                        addedCount++;
                    }
                }
            }

            pageCount++;
            const pagingMetadata = data.pagingMetadata;
            cursor = pagingMetadata?.next || null;
            if (!cursor) break;
        }

        await log.info("Wix API Sync successful", { user: userEmail, added: addedCount, skipped: skippedCount, pages: pageCount });
        return NextResponse.json({ success: true, added: addedCount, skipped: skippedCount, pages: pageCount });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }

  if (slug?.[0] === 'manual') {
    try {
      const body = await req.json();
      const { order_number, customer_name, product_name, variant, image_url, image_url2, image_url3, image_url4, quantity, print_name, notes } = body;
      
      await log.info("Manual order injection started", { user: userEmail, order_number, customer_name });

      if (image_url && !isValidHttpsUrl(image_url)) {
        await log.warn("Manual injection rejected: Invalid image URL", { user: userEmail, order_number, image_url });
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }

      const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
      await db.prepare("INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, image_url2, image_url3, image_url4, quantity, status, print_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?)")
        .bind(crypto.randomUUID(), order_number, customer_name, product_name, variant, image_url, image_url2 || null, image_url3 || null, image_url4 || null, qty, print_name || null, notes || null).run();
      
      await log.info("Manual order injection successful", { user: userEmail, order_number });
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }

  if (slug?.[0] === 'update') {
    try {
      const body = await req.json();
      const { id, order_number, customer_name, product_name, variant, image_url, image_url2, image_url3, image_url4, quantity, print_name, notes } = body;
      
      if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
      
      await log.info("Order update started", { user: userEmail, id, order_number });

      const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
      await db.prepare("UPDATE orders SET order_number = ?, customer_name = ?, product_name = ?, variant = ?, image_url = ?, image_url2 = ?, image_url3 = ?, image_url4 = ?, quantity = ?, print_name = ?, notes = ? WHERE id = ?")
        .bind(order_number, customer_name, product_name, variant, image_url, image_url2 || null, image_url3 || null, image_url4 || null, qty, print_name || null, notes || null, id).run();
      
      await log.info("Order update successful", { user: userEmail, id, order_number });
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail, slug }); }
  }


  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  const userRole = (session?.user as { role?: string })?.role;
  if (!session || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (slug?.[0] === 'delete') {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const orderNumber = searchParams.get('order_number');
    try {
      if (id) {
        const existing = await db.prepare("SELECT order_number FROM orders WHERE id = ?").bind(id).first() as { order_number: string } | null;
        await db.batch([
          db.prepare("DELETE FROM audit_logs WHERE order_id = ?").bind(id),
          db.prepare("DELETE FROM orders WHERE id = ?").bind(id)
        ]);
        await db.prepare("INSERT INTO audit_logs (order_id, order_number, user_email, action_type, action, details) VALUES (?, ?, ?, 'ORDER_DELETE', 'Order deleted', ?)")
          .bind(id, existing?.order_number || id, session?.user?.email || "SYSTEM", JSON.stringify({ order_number: existing?.order_number })).run();
      } else if (orderNumber) {
        const ordersToDelete = await db.prepare("SELECT id, order_number FROM orders WHERE order_number = ?").bind(orderNumber).all();
        await db.batch([
          db.prepare("DELETE FROM audit_logs WHERE order_id IN (SELECT id FROM orders WHERE order_number = ?)").bind(orderNumber),
          db.prepare("DELETE FROM shipments WHERE order_number = ?").bind(orderNumber),
          db.prepare("DELETE FROM orders WHERE order_number = ?").bind(orderNumber)
        ]);
        const userEmail = session?.user?.email || "SYSTEM";
        for (const order of (ordersToDelete.results as { id: string; order_number: string }[])) {
          await db.prepare("INSERT INTO audit_logs (order_id, order_number, user_email, action_type, action, details) VALUES (?, ?, ?, 'ORDER_DELETE', 'Order deleted', ?)")
            .bind(order.id, order.order_number, userEmail, JSON.stringify({ order_number: order.order_number })).run();
        }
      }
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
