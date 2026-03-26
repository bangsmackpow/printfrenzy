import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

// Lightweight CSV parser to replace 'csv-parse' dependency
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
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
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 2. Default: GET /api/orders
  try {
    const results = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return NextResponse.json(results.results);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
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
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 2. POST /api/orders/bulk-status
  if (slug?.[0] === 'bulk-status') {
    try {
      const { orderIds, status } = await req.json();
      const placeholders = orderIds.map(() => '?').join(',');
      await db.prepare(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`).bind(status, ...orderIds).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 3. POST /api/orders/status
  if (slug?.[0] === 'status') {
    try {
      const { id, status } = await req.json();
      await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 4. POST /api/orders/update-notes
  if (slug?.[0] === 'update-notes') {
    try {
      const { order_number, notes } = await req.json();
      await db.prepare("UPDATE orders SET notes = ? WHERE order_number = ?").bind(notes, order_number).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 5. POST /api/orders/update-item
  if (slug?.[0] === 'update-item') {
    try {
      const { id, print_name } = await req.json();
      await db.prepare("UPDATE orders SET print_name = ? WHERE id = ?").bind(print_name, id).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 6. POST /api/orders/manual
  if (slug?.[0] === 'manual') {
    try {
      const { order_number, customer_name, product_name, variant, image_url, quantity } = await req.json();
      await db.prepare("INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'RECEIVED')")
        .bind(crypto.randomUUID(), order_number, customer_name, product_name, variant, image_url, quantity || 1).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (slug?.[0] === 'delete') {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const orderNumber = searchParams.get('order_number');
    try {
      if (id) await db.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
      else if (orderNumber) await db.prepare("DELETE FROM orders WHERE order_number = ?").bind(orderNumber).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
