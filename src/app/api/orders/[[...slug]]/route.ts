import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

// Lightweight CSV parser to replace 'csv-parse' dependency
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

/**
 * Consolidated Orders API
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const db = (process.env as unknown as { DB: D1Database }).DB;



  // 1. GET /api/orders/details?order_number=...
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
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 2. GET /api/orders/single?id=...
  if (slug?.[0] === 'single') {
    const id = searchParams.get('id');
    try {
      if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
      const result = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
      return NextResponse.json(result);
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 3. Default: GET /api/orders
  try {
    const results = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return NextResponse.json(results.results);
  } catch (e: unknown) { 
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  // Exception for 'import' if x-api-key is present
  const apiKey = req.headers.get("x-api-key");
  const validApiKey = process.env.API_IMPORT_KEY;
  
  let authorized = !!session;
  if (!authorized && slug?.[0] === 'import' && apiKey && validApiKey && apiKey === validApiKey) {
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. POST /api/orders/import (CSV Upload)
  if (slug?.[0] === 'import') {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const batchName = formData.get('batch_name') as string || "";
        if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

        const text = await file.text();
        const records = parseCSV(text);
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
        return NextResponse.json({ count });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 2. POST /api/orders/bulk-status
  if (slug?.[0] === 'bulk-status') {
    try {
      const { orderIds, status } = await req.json();
      const placeholders = orderIds.map(() => '?').join(',');
      await db.prepare(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`).bind(status, ...orderIds).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 3. POST /api/orders/status
  if (slug?.[0] === 'status') {
    try {
      const { id, status } = await req.json();
      await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 4. POST /api/orders/update-notes
  if (slug?.[0] === 'update-notes') {
    try {
      const { order_number, notes } = await req.json();
      await db.prepare("UPDATE orders SET notes = ? WHERE order_number = ?").bind(notes, order_number).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 5. POST /api/orders/update-item
  if (slug?.[0] === 'update-item') {
    try {
      const { id, print_name } = await req.json();
      await db.prepare("UPDATE orders SET print_name = ? WHERE id = ?").bind(print_name, id).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 6. POST /api/orders/sync (Real-time Wix Direct API Sync)
  if (slug?.[0] === 'sync') {
    const WIX_API_KEY = process.env.WIX_API_KEY;
    const WIX_SITE_ID = process.env.WIX_SITE_ID;

    if (!WIX_API_KEY || !WIX_SITE_ID) {
      return NextResponse.json({ error: "Missing WIX_API_KEY or WIX_SITE_ID in environment" }, { status: 500 });
    }

    try {
        // Fetch last 20 paid orders from Wix
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
                    paging: { limit: 20 }
                }
            })
        });

        if (!wRes.ok) {
            const errData = await wRes.json();
            return NextResponse.json({ error: "Wix API Error", details: errData }, { status: wRes.status });
        }

        const { orders } = await wRes.json();
        let addedCount = 0;
        let skippedCount = 0;

        for (const order of (orders || [])) {
            const orderNumber = order.number.toString();
            const customerName = (order.billingInfo?.address?.fullName || order.billingInfo?.contactDetails?.firstName + " " + order.billingInfo?.contactDetails?.lastName || "Unknown").toUpperCase();
            
            for (const item of (order.lineItems || [])) {
                const productName = (item.name || "Product").toUpperCase();
                const variant = (item.description || "").trim().toUpperCase();
                const imageUrl = item.image; // Wix usually provides the wix:image:// URL here or a static one
                const qty = item.quantity || 1;
                const orderedAt = order._createdDate;

                // Simple deduplication CHECK: Look for this exact order number and item name for this customer
                // (Until we have a wix_item_id column, we use the composite of these fields)
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

        return NextResponse.json({ success: true, added: addedCount, skipped: skippedCount });
    } catch (e: unknown) {
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 7. POST /api/orders/manual
  if (slug?.[0] === 'manual') {
    try {
      const { order_number, customer_name, product_name, variant, image_url, quantity } = await req.json();
      await db.prepare("INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'RECEIVED')")
        .bind(crypto.randomUUID(), order_number, customer_name, product_name, variant, image_url, quantity || 1).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 8. POST /api/orders/update
  if (slug?.[0] === 'update') {
    try {
      const { id, order_number, customer_name, product_name, variant, image_url, quantity } = await req.json();
      if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

      await db.prepare("UPDATE orders SET order_number = ?, customer_name = ?, product_name = ?, variant = ?, image_url = ?, quantity = ? WHERE id = ?")
        .bind(order_number, customer_name, product_name, variant, image_url, quantity, id).run();
      
      // Log the update
      await db.prepare("INSERT INTO audit_logs (order_id, user_email, action) VALUES (?, ?, ?)")
        .bind(id, session?.user?.email || "SYSTEM", `Updated order details`).run();

      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
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
        await db.batch([
          db.prepare("DELETE FROM audit_logs WHERE order_id = ?").bind(id),
          // We don't delete shipments here because it's a batch-level entity, 
          // but we clear the order itself
          db.prepare("DELETE FROM orders WHERE id = ?").bind(id)
        ]);
      } else if (orderNumber) {
        // For batch delete, clear everything related to these orders
        await db.batch([
          db.prepare("DELETE FROM audit_logs WHERE order_id IN (SELECT id FROM orders WHERE order_number = ?)").bind(orderNumber),
          db.prepare("DELETE FROM shipments WHERE order_number = ?").bind(orderNumber),
          db.prepare("DELETE FROM orders WHERE order_number = ?").bind(orderNumber)
        ]);
      }
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        const error = e as Error;
        return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
