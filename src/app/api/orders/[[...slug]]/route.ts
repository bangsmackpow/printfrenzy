import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { hashPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

/**
 * Consolidated Orders API
 * Merging 8 routes into 1 to reduce Next.js Edge overhead by ~2.5MB.
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

  // 2. GET /api/orders (Standard list)
  try {
    const results = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return NextResponse.json(results.results);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. POST /api/orders/bulk-status
  if (slug?.[0] === 'bulk-status') {
    try {
      const { orderIds, status } = await req.json();
      const placeholders = orderIds.map(() => '?').join(',');
      await db.prepare(`UPDATE orders SET status = ? WHERE id IN (${placeholders})`).bind(status, ...orderIds).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 2. POST /api/orders/update-notes
  if (slug?.[0] === 'update-notes') {
    try {
      const { order_number, notes } = await req.json();
      await db.prepare("UPDATE orders SET notes = ? WHERE order_number = ?").bind(notes, order_number).run();
      return NextResponse.json({ success: true });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 3. POST /api/orders/manual (New Order)
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
