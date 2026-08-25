import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";

export const runtime = 'edge';

const MAX_EVENTS = 50;
const MAX_MESSAGE_LENGTH = 500;
const MAX_DATA_KEYS = 20;
const MAX_VALUE_LENGTH = 500;
const ALLOWED_LEVELS = ['info', 'warn', 'error'] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userEmail = session.user?.email || "unknown";

  let body: { events?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const events = Array.isArray(body?.events) ? body.events : [];
  if (events.length === 0) return NextResponse.json({ error: "No events" }, { status: 400 });
  if (events.length > MAX_EVENTS) return NextResponse.json({ error: "Too many events" }, { status: 413 });

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    const record = ev as { level?: unknown; message?: unknown; data?: unknown };
    const level = ALLOWED_LEVELS.includes(record.level as typeof ALLOWED_LEVELS[number])
      ? record.level as typeof ALLOWED_LEVELS[number]
      : 'info';
    const message = typeof record.message === 'string'
      ? record.message.slice(0, MAX_MESSAGE_LENGTH)
      : 'Client telemetry event';

    const sanitized: Record<string, unknown> = { client: true, userEmail };
    if (record.data && typeof record.data === 'object') {
      const source = record.data as Record<string, unknown>;
      for (const key of Object.keys(source).slice(0, MAX_DATA_KEYS)) {
        const value = source[key];
        sanitized[key] = typeof value === 'string' ? value.slice(0, MAX_VALUE_LENGTH) : value;
      }
    }

    if (level === 'error') await log.error(message, sanitized);
    else if (level === 'warn') await log.warn(message, sanitized);
    else await log.info(message, sanitized);
  }

  return NextResponse.json({ success: true });
}