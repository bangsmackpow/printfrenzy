import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

interface D1PreparedStatement {
  bind: (...args: unknown[]) => D1PreparedStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
}

export async function GET() {
  const results: {
    timestamp: string;
    env: { has_db: boolean; has_auth_secret: boolean };
    tests: Record<string, unknown>;
  } = {
    timestamp: new Date().toISOString(),
    env: {
      has_db: !!(process.env as unknown as { DB: D1Database }).DB,
      has_auth_secret: !!process.env.AUTH_SECRET,
    },
    tests: {}
  };

  try {
    const db = (process.env as unknown as { DB: D1Database }).DB;
    if (db) {
      const start = Date.now();
      const userCount = await db.prepare("SELECT count(*) as count FROM users").first<{ count: number }>();
      results.tests.db_query = {
        success: true,
        count: userCount?.count,
        duration: `${Date.now() - start}ms`
      };
    }
  } catch (e: unknown) {
    const err = e as Error;
    results.tests.db_query = { success: false, error: err.message };
  }

  try {
    const pass = "admin123";
    const hash = "$2a$10$7RQxLzIiVGXlel3Qn4tBBedvLk9PINr4sqljxq/IHpIrCRD2xS17i"; // The one we set
    const start = Date.now();
    const isMatch = await bcrypt.compare(pass, hash);
    results.tests.bcrypt_compare = {
      success: true,
      match: isMatch,
      duration: `${Date.now() - start}ms`
    };
  } catch (e: unknown) {
    const err = e as Error;
    results.tests.bcrypt_compare = { success: false, error: err.message };
  }

  return NextResponse.json(results);
}
