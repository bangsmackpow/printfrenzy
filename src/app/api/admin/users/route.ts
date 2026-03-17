import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export const runtime = 'edge';

export async function GET() {
  const session = await auth();
  
  // Basic security check
  if (!session) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }
  
  if ((session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Access Denied: Admin role required" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: { prepare: (s: string) => { all: () => Promise<{ results: unknown[] }> } } }).DB;
  const { results } = await db.prepare("SELECT id, email, role, created_at FROM users").all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, password, role } = await req.json();
  const db = (process.env as unknown as { DB: { prepare: (s: string) => { bind: (...args: unknown[]) => { run: () => Promise<void> } } } }).DB;
  const id = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .bind(id, email, hashedPassword, role) 
      .run();
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}