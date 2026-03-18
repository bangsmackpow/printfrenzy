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
    const db = (process.env as unknown as { DB: D1Database }).DB;
    if (db) {
      const email = "curtis@printfrenzy.dev";
      const pass = "admin123";
      
      const userQueryResult = await db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
        .bind(email)
        .first();
      
      const user = userQueryResult as { email: string; password_hash: string } | null;
      
      if (user) {
        const start = Date.now();
        const hash = user.password_hash;
        const cleanHash = hash.trim();
        const isMatch = await bcrypt.compare(pass, cleanHash);
        
        const getHex = (s: string) => Array.from(s).map(c => c.charCodeAt(0).toString(16)).join(' ');
        
        results.tests.live_db_check = {
          success: true,
          email: user.email,
          raw_len: hash.length,
          clean_len: cleanHash.length,
          last_chars_hex: getHex(hash.slice(-5)),
          match: isMatch,
          duration: `${Date.now() - start}ms`
        };
      } else {
        results.tests.live_db_check = { success: false, error: "User curtis@printfrenzy.dev not found in DB" };
      }
    }
  } catch (e: unknown) {
    const err = e as Error;
    results.tests.live_db_check = { success: false, error: err.message };
  }

  return NextResponse.json(results);
}
