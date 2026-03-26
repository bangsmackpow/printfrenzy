import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const db = (process.env as unknown as { DB: D1Database }).DB;

  // 1. GET /api/shipping/status?order_number=...&customer_name=...
  if (slug?.[0] === 'status') {
    const orderNumber = searchParams.get('order_number');
    const customerName = searchParams.get('customer_name');
    if (!orderNumber || !customerName) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    try {
      const shipment = await db.prepare("SELECT tracking_number, label_url FROM shipments WHERE order_number = ? AND customer_name = ? ORDER BY created_at DESC LIMIT 1")
        .bind(orderNumber, customerName).first();
      return NextResponse.json({ shipment });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  // 2. GET /api/shipping (List all)
  try {
    const results = await db.prepare("SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100").all();
    return NextResponse.json(results.results);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // 1. POST /api/shipping/generate
  if (slug?.[0] === 'generate') {
    const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
    if (!SHIPPO_API_KEY) return NextResponse.json({ error: "Missing Shippo Key" }, { status: 500 });

    try {
      const body = await req.json();
      const { order_number, customer_name, street, city, state, zip } = body;

      const senderAddress = process.env.SHIPPO_SENDER_ADDRESS_JSON 
        ? JSON.parse(process.env.SHIPPO_SENDER_ADDRESS_JSON) 
        : { name: "Print Frenzy", street1: "123 Main St", city: "Creston", state: "IA", zip: "50801", country: "US" };

      const toAddress = { name: customer_name || "Customer", street1: street, city: city, state: state, zip: zip, country: "US" };
      const parcel = { length: "12", width: "10", height: "4", distance_unit: "in", weight: "16", mass_unit: "oz" };

      // Create Shipment
      const sRes = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_from: senderAddress, address_to: toAddress, parcels: [parcel], async: false })
      });
      const shipment = await sRes.json();
      const rates = shipment.rates;
      if (!rates || rates.length === 0) return NextResponse.json({ error: "No rates" }, { status: 400 });

      const uspsRates = rates.filter((r: any) => r.provider === 'USPS');
      const selectedRate = uspsRates.length > 0 ? uspsRates[0] : rates[0];

      // Purchase Label
      const tRes = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: selectedRate.object_id, label_file_type: "PDF", async: false })
      });
      const transaction = await tRes.json();
      if (transaction.status !== 'SUCCESS') return NextResponse.json({ error: "Purchase failed" }, { status: 400 });

      await db.prepare("INSERT INTO shipments (id, order_number, customer_name, street, city, state, zip, tracking_number, label_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), order_number, customer_name, street, city, state, zip, transaction.tracking_number, transaction.label_url).run();

      return NextResponse.json({ success: true, tracking_number: transaction.tracking_number, label_url: transaction.label_url });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
