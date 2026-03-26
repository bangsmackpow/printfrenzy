import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const role = (session.user as { role?: string })?.role;
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: "Forbidden: Admins/Managers only" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;

  if (!SHIPPO_API_KEY) {
    return NextResponse.json({ error: "SHIPPO_API_KEY is not configured on the server." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { order_number, customer_name, street, city, state, zip } = body;

    if (!order_number || !street || !city || !state || !zip) {
      return NextResponse.json({ error: "Missing required address fields" }, { status: 400 });
    }

    const senderAddress = process.env.SHIPPO_SENDER_ADDRESS_JSON 
        ? JSON.parse(process.env.SHIPPO_SENDER_ADDRESS_JSON) 
        : {
            name: "Print Frenzy",
            street1: "123 Main St",
            city: "San Francisco",
            state: "CA",
            zip: "94105",
            country: "US"
        };

    const toAddress = {
        name: customer_name || "Customer",
        street1: street,
        city: city,
        state: state,
        zip: zip,
        country: "US"
    };

    const parcel = {
        length: "12",
        width: "10",
        height: "4",
        distance_unit: "in",
        weight: "16",
        mass_unit: "oz"
    };

    // 1. Create Shipment
    const shipmentRes = await fetch('https://api.goshippo.com/shipments/', {
        method: 'POST',
        headers: {
            'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            address_from: senderAddress,
            address_to: toAddress,
            parcels: [parcel],
            async: false
        })
    });

    if (!shipmentRes.ok) {
        const errorText = await shipmentRes.text();
        console.error("Shippo Shipment Error:", errorText);
        return NextResponse.json({ error: "Failed to create shipment with Shippo" }, { status: 500 });
    }

    const shipment = await shipmentRes.json();
    const rates = shipment.rates;

    if (!rates || rates.length === 0) {
        return NextResponse.json({ error: "No shipping rates found for this address" }, { status: 400 });
    }

    // Pick cheapest USPS rate (or fallback to cheapest overall)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uspsRates = rates.filter((r: any) => r.provider === 'USPS');
    const selectedRate = uspsRates.length > 0 ? uspsRates[0] : rates[0];

    // 2. Purchase Label (Transaction)
    const transactionRes = await fetch('https://api.goshippo.com/transactions/', {
        method: 'POST',
        headers: {
            'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            rate: selectedRate.object_id,
            label_file_type: "PDF",
            async: false
        })
    });

    if (!transactionRes.ok) {
        const errorText = await transactionRes.text();
        console.error("Shippo Transaction Error:", errorText);
        return NextResponse.json({ error: "Failed to purchase label" }, { status: 500 });
    }

    const transaction = await transactionRes.json();

    if (transaction.status !== 'SUCCESS') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return NextResponse.json({ error: transaction.messages?.[0]?.text || "Transaction failed" }, { status: 400 });
    }

    const tracking_number = transaction.tracking_number;
    const label_url = transaction.label_url;

    // Save to DB
    const shipmentId = crypto.randomUUID();
    await db.prepare(`
        INSERT INTO shipments (id, order_number, customer_name, street, city, state, zip, tracking_number, label_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(shipmentId, order_number, customer_name, street, city, state, zip, tracking_number, label_url).run();

    return NextResponse.json({
        success: true,
        tracking_number,
        label_url
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Shipping API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
