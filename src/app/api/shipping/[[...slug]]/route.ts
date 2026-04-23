import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";

export const runtime = 'edge';

async function sanitizeError(e: unknown, context: Record<string, any> = {}): Promise<NextResponse> {
  const message = e instanceof Error ? e.message : "Unknown error";
  await log.error("Shipping API failure", { error: message, ...context });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (slug?.[0] === 'status') {
    const orderNumber = searchParams.get('order_number');
    const customerName = searchParams.get('customer_name');
    if (!orderNumber || !customerName) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    try {
      const shipment = await db.prepare("SELECT tracking_number, label_url FROM shipments WHERE order_number = ? AND customer_name = ? ORDER BY created_at DESC LIMIT 1")
        .bind(orderNumber, customerName).first();
      return NextResponse.json({ shipment });
    } catch (e: unknown) { return sanitizeError(e, { orderNumber, customerName }); }
  }

  try {
    const results = await db.prepare("SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100").all();
    return NextResponse.json(results.results);
  } catch (e: unknown) { return sanitizeError(e); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  const userEmail = session?.user?.email || "unknown";

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (slug?.[0] === 'rates') {
    const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
    if (!SHIPPO_API_KEY) {
      await log.error("Shippo API Key missing", { user: userEmail });
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    try {
      const body = await req.json();
      const { customer_name, street, city, state, zip, weight, length, width, height } = body;
      
      await log.info("Fetching shipping rates", { user: userEmail, customer: customer_name, zip });

      const finalWeight = weight || "7";
      const finalLength = length || "12";
      const finalWidth = width || "11";
      const finalHeight = height || "2";

      const senderAddress = process.env.SHIPPO_SENDER_ADDRESS_JSON 
        ? JSON.parse(process.env.SHIPPO_SENDER_ADDRESS_JSON) 
        : { name: "Print Frenzy", street1: "123 Main St", city: "Creston", state: "IA", zip: "50801", country: "US", email: "curtis@printfrenzy.dev", phone: "6415551234" };

      if (!senderAddress.email) senderAddress.email = "curtis@printfrenzy.dev";
      if (!senderAddress.phone) senderAddress.phone = "6415551234";

      const toAddress = { name: customer_name || "Customer", street1: street, city: city, state: state, zip: zip, country: "US" };
      const parcel = { 
        length: finalLength, 
        width: finalWidth, 
        height: finalHeight, 
        distance_unit: "in", 
        weight: finalWeight, 
        mass_unit: "oz" 
      };

      const sRes = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address_from: senderAddress, 
          address_to: toAddress, 
          parcels: [parcel], 
          extra: { postage_price_on_label: false },
          async: false 
        })
      });
      
      const shipment = await sRes.json() as any;
      
      if (!sRes.ok) {
        await log.error("Shippo rates request failed", { status: sRes.status, response: shipment, user: userEmail });
        return NextResponse.json({ error: "Failed to fetch rates from carrier" }, { status: 400 });
      }

      const allRates = (shipment.rates || []);
      await log.info("Shipping rates retrieved", { user: userEmail, count: allRates.length });
      
      return NextResponse.json({ rates: allRates });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail }); }
  }

  if (slug?.[0] === 'purchase') {
    const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
    if (!SHIPPO_API_KEY) return NextResponse.json({ error: "Configuration error" }, { status: 500 });

    try {
      const body = await req.json();
      const { rate_id, order_number, customer_name, street, city, state, zip } = body;
      const finalOrderNumber = order_number || 'MANUAL';

      await log.info("Purchasing shipping label", { user: userEmail, order: finalOrderNumber, rate_id });

      const tRes = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rate_id, label_file_type: "PDF", async: false })
      });
      
      const transaction = await tRes.json() as { status: string; tracking_number: string; label_url: string; messages?: any[] };
      
      if (transaction.status !== 'SUCCESS') {
        await log.error("Shippo purchase failed", { transaction, user: userEmail, order: finalOrderNumber });
        return NextResponse.json({ error: "Failed to purchase shipping label" }, { status: 400 });
      }

      const shipmentId = crypto.randomUUID();
      await db.prepare("INSERT INTO shipments (id, order_number, customer_name, street, city, state, zip, tracking_number, label_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(shipmentId, finalOrderNumber, customer_name, street, city, state, zip, transaction.tracking_number, transaction.label_url).run();

      await db.prepare("INSERT INTO audit_logs (order_id, order_number, user_email, action_type, action, details) VALUES (?, ?, ?, 'SHIPMENT_CREATED', 'Shipping label purchased', ?)")
        .bind(null, finalOrderNumber, userEmail, 'SHIPMENT_CREATED', 'Shipping label purchased', JSON.stringify({
          tracking_number: transaction.tracking_number,
          destination: `${customer_name}, ${street}, ${city}, ${state} ${zip}`,
          label_url: transaction.label_url
        })).run();

      await log.info("Label purchased successfully", { user: userEmail, order: finalOrderNumber, tracking: transaction.tracking_number });

      return NextResponse.json({ success: true, tracking_number: transaction.tracking_number, label_url: transaction.label_url });
    } catch (e: unknown) { return sanitizeError(e, { user: userEmail }); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

