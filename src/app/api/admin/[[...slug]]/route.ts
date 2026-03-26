import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. GET /api/admin/users
  if (slug?.[0] === 'users') {
    try {
      const results = await db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { 
      return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  // 2. GET /api/admin/audit
  if (slug?.[0] === 'audit') {
    try {
      const results = await db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { 
      return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. POST /api/admin/users
  if (slug?.[0] === 'users') {
    try {
      const { email, password, role } = await req.json();
      const hashedPassword = await hashPassword(password);
      await db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), email, hashedPassword, role || 'USER').run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  // 2. POST /api/admin/clear
  if (slug?.[0] === 'clear') {
    try {
      const { password } = await req.json();
      const adminEmail = session.user?.email;
      const adminUser = await db.prepare("SELECT password_hash FROM users WHERE email = ?").bind(adminEmail).first() as { password_hash: string } | null;
      if (!adminUser || !(await verifyPassword(password, adminUser.password_hash))) {
        return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
      }
      await db.prepare("DELETE FROM orders").run();
      await db.prepare("DELETE FROM shipments").run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  // 3. POST /api/admin/users/password (Reset another user's password)
  if (slug?.[0] === 'users' && slug?.[1] === 'password') {
    try {
        const { id, password } = await req.json();
        const hashedPassword = await hashPassword(password);
        await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hashedPassword, id).run();
        return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. DELETE /api/admin/users?id=...
  if (slug?.[0] === 'users') {
    try {
      const id = new URL(req.url).searchParams.get('id');
      if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });
      await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { 
        return NextResponse.json({ error: (e as Error).message }, { status: 500 }); 
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
