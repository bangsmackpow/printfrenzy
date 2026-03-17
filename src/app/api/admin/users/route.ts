import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth"; // Use your new auth engine

export const runtime = 'edge';

export async function GET() {
  const session = await auth();
  
  // Basic security check
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = (process.env as any).DB;
  const { results } = await db.prepare("SELECT id, email, role, created_at FROM users").all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, password, role } = await req.json();
  const db = (process.env as any).DB;
  const id = crypto.randomUUID();

  try {
    await db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .bind(id, email, password, role) 
      .run();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}