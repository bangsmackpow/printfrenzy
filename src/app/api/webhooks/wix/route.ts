import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function sanitizeError(e: unknown): never {
  if (e instanceof Error) console.error("Wix webhook error:", e.message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 }) as never;
}

// Constant-time comparison for strings/buffers
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function verifyWixSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const [algorithm, hash] = signature.split('=');
    if (algorithm !== 'sha256') return false;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const computedBuffer = encoder.encode(computedHash);
    const receivedBuffer = encoder.encode(hash);

    return constantTimeCompare(computedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const WIX_WEBHOOK_SECRET = process.env.WIX_WEBHOOK_SECRET;
  if (!WIX_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get('x-wix-signature');
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await req.text();

  if (!(await verifyWixSignature(rawBody, signature, WIX_WEBHOOK_SECRET))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const payload = JSON.parse(rawBody);
    const eventType = payload?.eventType || payload?.instance?.eventType;

    if (eventType !== 'wixstores:order' && eventType !== 'wixstores:order-created') {
      return NextResponse.json({ success: true, message: "Ignored non-order event" });
    }

    const order = payload?.data?.data?.order || payload?.data?.order;
    if (!order) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const orderNumber = order.number?.toString() || order._id || "UNKNOWN";
    const customerName = (
      order.billingInfo?.address?.fullName || 
      order.billingInfo?.contactDetails?.firstName + " " + order.billingInfo?.contactDetails?.lastName || 
      "Unknown"
    ).toUpperCase();

    let addedCount = 0;
    let skippedCount = 0;

    for (const item of (order.lineItems || [])) {
      const productName = (item.name || "Product").toUpperCase();
      const variant = (item.description || "").trim().toUpperCase();
      const imageUrl = item.image;
      const qty = item.quantity || 1;
      const orderedAt = order._createdDate || new Date().toISOString();

      const existing = await db.prepare(
        "SELECT id FROM orders WHERE order_number = ? AND customer_name = ? AND product_name = ? AND variant = ? AND quantity = ?"
      ).bind(orderNumber, customerName, productName, variant, qty).first();

      if (existing) {
        skippedCount++;
        continue;
      }

      if (imageUrl) {
        await db.prepare(
          "INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, ordered_at, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED')"
        ).bind(
          crypto.randomUUID(),
          orderNumber,
          customerName,
          productName,
          variant,
          imageUrl,
          orderedAt,
          qty
        ).run();
        addedCount++;
      }
    }

    console.log(`Wix webhook processed: ${addedCount} added, ${skippedCount} skipped for order ${orderNumber}`);

    return NextResponse.json({ 
      success: true, 
      added: addedCount, 
      skipped: skippedCount,
      order_number: orderNumber 
    });
  } catch (e: unknown) { 
    return sanitizeError(e); 
  }
}
