import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

const VALID_STAGES = ['RECEIVED', 'ORDERING', 'PRINTING', 'STAGING', 'PRODUCTION', 'COMPLETED', 'ARCHIVED'];

function sanitizeError(e: unknown): never {
  if (e instanceof Error) console.error("Notification API error:", e.message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 }) as never;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const email = session.user?.email;

  if (slug?.[0] === 'subscribe') {
    try {
      const results = await db.prepare("SELECT stage FROM notification_subscriptions WHERE user_email = ?").bind(email).all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'poll') {
    try {
      const { searchParams } = new URL(req.url);
      const since = searchParams.get('since');
      
      let query = "SELECT * FROM notifications WHERE user_email = ? AND read = 0";
      const bindParams: string[] = [email!];
      
      if (since) {
        query += " AND timestamp > ?";
        bindParams.push(since);
      }
      
      query += " ORDER BY timestamp DESC LIMIT 50";
      
      const results = await db.prepare(query).bind(...bindParams).all();
      return NextResponse.json(results.results);
    } catch (e: unknown) { return sanitizeError(e); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const email = session.user?.email;

  if (slug?.[0] === 'subscribe') {
    try {
      const { stage, subscribe } = await req.json();
      if (!stage || !VALID_STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
      
      if (subscribe) {
        await db.prepare("INSERT OR IGNORE INTO notification_subscriptions (user_email, stage) VALUES (?, ?)")
          .bind(email, stage).run();
      } else {
        await db.prepare("DELETE FROM notification_subscriptions WHERE user_email = ? AND stage = ?")
          .bind(email, stage).run();
      }
      
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  if (slug?.[0] === 'read') {
    try {
      const { ids } = await req.json();
      
      if (ids && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await db.prepare(`UPDATE notifications SET read = 1 WHERE id IN (${placeholders}) AND user_email = ?`)
          .bind(...ids, email).run();
      } else {
        await db.prepare("UPDATE notifications SET read = 1 WHERE user_email = ? AND read = 0")
          .bind(email).run();
      }
      
      return NextResponse.json({ success: true });
    } catch (e: unknown) { return sanitizeError(e); }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
