import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

const VALID_ROLES = ['ADMIN', 'MANAGER', 'USER'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeError(e: unknown): never {
  if (e instanceof Error) console.error("Admin API error:", e.message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 }) as never;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== 'ADMIN' && role !== 'MANAGER')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (slug?.[0] === 'users') {
    try {
      const results = await db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'audit') {
    try {
      const { searchParams } = new URL(req.url);
      const actionType = searchParams.get('action_type');
      const userEmail = searchParams.get('user_email');
      const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
      
      let query = `
        SELECT al.*, o.customer_name, o.product_name, o.variant
        FROM audit_logs al
        LEFT JOIN orders o ON al.order_id = o.id
      `;
      const conditions: string[] = [];
      const bindParams: (string | number)[] = [];
      
      if (actionType) {
        conditions.push('al.action_type = ?');
        bindParams.push(actionType);
      }
      if (userEmail) {
        conditions.push('al.user_email = ?');
        bindParams.push(userEmail);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY al.timestamp DESC LIMIT ?';
      bindParams.push(limit);
      
      const results = await db.prepare(query).bind(...bindParams).all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { return sanitizeError(e); }
  }
  
  if (slug?.[0] === 'audit' && slug?.[1] === 'users') {
    try {
      const results = await db.prepare("SELECT DISTINCT user_email FROM audit_logs WHERE user_email != 'SYSTEM' ORDER BY user_email ASC").all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { return sanitizeError(e); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== 'ADMIN' && role !== 'MANAGER')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (slug?.[0] === 'users') {
    try {
      const { email, password, role: newRole } = await req.json();
      if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      if (newRole && !VALID_ROLES.includes(newRole)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

      const hashedPassword = await hashPassword(password);
      await db.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), email, hashedPassword, newRole || 'USER').run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'backfill-images') {
    try {
      const before = await db.prepare("SELECT COUNT(*) as count FROM orders WHERE image_url IS NULL OR image_url = ''").first() as { count: number };
      await db.prepare("UPDATE orders SET image_url = 'https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev/placeholder.svg' WHERE image_url IS NULL OR image_url = ''").run();
      return NextResponse.json({ success: true, updated: before.count });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'clear') {
    try {
      const { password } = await req.json();
      const adminEmail = session.user?.email;
      const adminUser = await db.prepare("SELECT password_hash FROM users WHERE email = ?").bind(adminEmail).first() as { password_hash: string } | null;
      if (!adminUser || !(await verifyPassword(password, adminUser.password_hash))) {
        return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
      }
      const orderCount = await db.prepare("SELECT COUNT(*) as count FROM orders").first() as { count: number };
      await db.prepare("DELETE FROM orders").run();
      await db.prepare("DELETE FROM shipments").run();
      await db.prepare("INSERT INTO audit_logs (user_email, action_type, action, details) VALUES (?, 'SYSTEM_CLEAR', 'All orders cleared', ?)")
        .bind(adminEmail, JSON.stringify({ orders_cleared: orderCount.count })).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'users' && slug?.[1] === 'password') {
    try {
        const { id, password } = await req.json();
        if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        const hashedPassword = await hashPassword(password);
        await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hashedPassword, id).run();
        return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'users' && slug?.[1] === 'email') {
    try {
        const { id, email } = await req.json();
        if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        await db.prepare("UPDATE users SET email = ? WHERE id = ?").bind(email, id).run();
        return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== 'ADMIN' && role !== 'MANAGER')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (slug?.[0] === 'users') {
    try {
      const id = new URL(req.url).searchParams.get('id');
      if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });
      await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
