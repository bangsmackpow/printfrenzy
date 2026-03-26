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

export async function POST(req: NextRequest) {
  const session = await auth();
  // Allow authentication via session OR API Key (for email workers)
  const apiKey = req.headers.get("x-api-key");
  const validApiKey = process.env.API_IMPORT_KEY;
  
  let authorized = false;
  if (session) {
    const role = (session.user as { role?: string })?.role;
    if (role === 'ADMIN' || role === 'MANAGER') authorized = true;
  } else if (apiKey && validApiKey && apiKey === validApiKey) {
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const batchName = formData.get('batch_name') as string || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const db = (process.env as unknown as { DB: D1Database }).DB;

    const records = parseCSV(text);

    if (records.length === 0) {
      return NextResponse.json({ error: "No records found in CSV" }, { status: 400 });
    }

    let importCount = 0;
    let skipCount = 0;

    for (const record of records) {
      // Mapping Wix Columns
      const wixOrderNum = record['Order number'] || record['Order ID'] || record['order_number'];
      const customerName = record['Customer name'] || record['Billing Name'] || record['customer_name'] || 'Unknown Customer';
      const productName = record['Product name'] || record['Lineitem name'] || record['product_name'] || 'Unknown Product';
      const variant = (record['Product variant'] || record['Lineitem options'] || record['variant'] || '').trim();
      const imageUrl = record['Product image'] || record['Lineitem image URL'] || record['image_url'];
      const orderedAt = record['Date'] || record['ordered_at'];
      const quantity = parseInt(record['Quantity'] || '1', 10) || 1;

      if (!imageUrl) {
        skipCount++;
        continue;
      }

      // Use user-provided batchName OR the Wix order number
      const finalOrderNumber = batchName || wixOrderNum || "WIX-IMPORT";

      await db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, ordered_at, quantity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED')
      `).bind(
        crypto.randomUUID(),
        finalOrderNumber,
        customerName,
        productName,
        variant,
        imageUrl,
        orderedAt,
        quantity
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