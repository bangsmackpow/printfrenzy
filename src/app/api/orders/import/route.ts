import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync'; // npm install csv-parse

export const runtime = 'edge'; // Required for Cloudflare Workers/Pages

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userEmail = "admin@yourshop.com"; // Get this from your Auth session later

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const csvText = await file.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    // Access the Cloudflare D1 binding
    const db = (process.env as any).DB; 

    const insertPromises = records.map(async (row: any) => {
      const orderId = crypto.randomUUID();
      
      // 1. Insert the Order
      await db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ORDERED')
      `).bind(
        orderId,
        row['Order number'],
        row['Customer name'],
        row['Product name'],
        row['Product variant'],
        row['Product image'] // This is the raw Wix URL
      ).run();

      // 2. Log the Action (Tracking "Who does what")
      await db.prepare(`
        INSERT INTO audit_logs (order_id, user_email, action)
        VALUES (?, ?, ?)
      `).bind(orderId, userEmail, 'Imported via CSV').run();
    });

    await Promise.all(insertPromises);

    return NextResponse.json({ success: true, count: records.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}