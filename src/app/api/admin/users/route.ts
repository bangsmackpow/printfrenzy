import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export const runtime = 'edge';

export async function GET() {
  const db = (process.env as any).DB;
  const { results } = await db.prepare("SELECT id, email, role, created_at FROM users").all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const { email, password, role } = await req.json();
  const db = (process.env as any).DB;
  const id = crypto.randomUUID();

  try {
    await db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .bind(id, email, password, role) // In production, hash the password!
      .run();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}