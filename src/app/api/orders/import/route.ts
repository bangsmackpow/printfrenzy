import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const text = await file.text();
  
  // Simple CSV parser for Wix format
  const lines = text.split('\n');
  const headers = lines[0].split(',');
  const db = (process.env as any).DB;

  let importCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length < headers.length) continue;

    // Mapping Wix Columns (Adjust indices if your Wix export differs)
    const orderNumber = row[0]; // "Order ID"
    const customerName = row[17]; // "Billing Name"
    const productName = row[36]; // "Lineitem name"
    const variant = row[38]; // "Lineitem options"
    const imageUrl = row[42]; // "Lineitem image URL"

    if (!imageUrl) continue;

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

  return NextResponse.json({ success: true, count: importCount });
}