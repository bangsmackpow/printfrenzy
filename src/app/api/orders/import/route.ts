import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { parse } from 'csv-parse/sync';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }
  
  // For now, let Managers and Admins import
  const role = (session.user as { role?: string })?.role;
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: "Access Denied: Manager role required" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    if (!text.includes(',')) {
      return NextResponse.json({ error: "Invalid CSV format" }, { status: 400 });
    }

    const db = (process.env as unknown as { DB: D1Database }).DB;

    // Wix CSVs often have a preamble or specific header row. 
    // We'll use csv-parse with 'columns: true' to map by name.
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    if (records.length === 0) {
      return NextResponse.json({ error: "No records found in CSV" }, { status: 400 });
    }

    let importCount = 0;
    let skipCount = 0;

    for (const record of records as Array<Record<string, string>>) {
      // Mapping Wix Columns (Using common Wix export headers)
      const orderNumber = record['Order ID'] || record['order_number'];
      const customerName = record['Billing Name'] || record['customer_name'] || 'Unknown Customer';
      const productName = record['Lineitem name'] || record['product_name'] || 'Unknown Product';
      const variant = (record['Lineitem options'] || record['variant'] || '').trim();
      const imageUrl = record['Lineitem image URL'] || record['image_url'];

      if (!imageUrl || !orderNumber) {
        skipCount++;
        continue;
      }

      await db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ORDERED')
      `).bind(
        crypto.randomUUID(),
        orderNumber,
        customerName,
        productName,
        variant,
        imageUrl
      ).run();

      importCount++;
    }

    return NextResponse.json({ count: importCount, skipped: skipCount });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("CSV Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}