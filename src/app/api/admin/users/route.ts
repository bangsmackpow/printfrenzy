import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { hashPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .bind(id, email, hashedPassword, role || 'USER')
      .run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const results = await db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").all();
    return NextResponse.json(results.results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
