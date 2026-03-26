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
    } catch (e: unknown) { 
      const error = e as Error;
      return NextResponse.json({ error: error.message }, { status: 500 }); 
    }
  }

  // 2. GET /api/shipping (List all)
  try {
    const results = await db.prepare("SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100").all();
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

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // 1. POST /api/shipping/rates
  if (slug?.[0] === 'rates') {
    const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
    if (!SHIPPO_API_KEY) return NextResponse.json({ error: "Missing Shippo Key" }, { status: 500 });

    try {
      const body = await req.json();
      const { customer_name, street, city, state, zip, weight, length, width, height } = body;
      const finalWeight = weight || "7";
      const finalLength = length || "12";
      const finalWidth = width || "11";
      const finalHeight = height || "2";

      const senderAddress = process.env.SHIPPO_SENDER_ADDRESS_JSON 
        ? JSON.parse(process.env.SHIPPO_SENDER_ADDRESS_JSON) 
        : { name: "Print Frenzy", street1: "123 Main St", city: "Creston", state: "IA", zip: "50801", country: "US", email: "curtis@printfrenzy.dev", phone: "6415551234" };

      // Ensure email/phone exist (USPS requires them)
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
      const shipment = await sRes.json();
      const allRates = (shipment.rates || []);
      
      return NextResponse.json({ rates: allRates });
    } catch (e: unknown) { 
      return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  // 2. POST /api/shipping/purchase
  if (slug?.[0] === 'purchase') {
    const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;
    if (!SHIPPO_API_KEY) return NextResponse.json({ error: "Missing Shippo Key" }, { status: 500 });

    try {
      const body = await req.json();
      const { rate_id, order_number, customer_name, street, city, state, zip } = body;
      const finalOrderNumber = order_number || 'MANUAL';

      const tRes = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: { 'Authorization': `ShippoToken ${SHIPPO_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rate_id, label_file_type: "PDF", async: false })
      });
      const transaction = await tRes.json() as { status: string; tracking_number: string; label_url: string };
      
      if (transaction.status !== 'SUCCESS') return NextResponse.json({ error: "Purchase failed", details: transaction }, { status: 400 });

      await db.prepare("INSERT INTO shipments (id, order_number, customer_name, street, city, state, zip, tracking_number, label_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), finalOrderNumber, customer_name, street, city, state, zip, transaction.tracking_number, transaction.label_url).run();

      return NextResponse.json({ success: true, tracking_number: transaction.tracking_number, label_url: transaction.label_url });
    } catch (e: unknown) { 
      return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
