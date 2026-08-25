"use client";

type ClientLogLevel = 'info' | 'warn' | 'error';

interface ClientLogEvent {
  level: ClientLogLevel;
  message: string;
  data?: Record<string, unknown>;
}

const FLUSH_MS = 800;
const MAX_BUFFER = 20;

const buffer: ClientLogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function enqueue(level: ClientLogLevel, message: string, data?: Record<string, unknown>) {
  // SSR guard: this module also runs on the server during pre-render.
  if (typeof window === 'undefined') return;

  // Mirror to the browser console for local debugging.
  if (level === 'error') console.error(message, data);
  else if (level === 'warn') console.warn(message, data);
  else console.log(message, data);

  buffer.push({ level, message, data });

  if (buffer.length >= MAX_BUFFER) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_MS);
  }
}

async function flush() {
  if (typeof window === 'undefined') return;
  if (buffer.length === 0) return;

  const events = buffer.splice(0, buffer.length);
  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Telemetry must never break the UI.
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}

export const logClient = {
  info: (message: string, data?: Record<string, unknown>) => enqueue('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => enqueue('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => enqueue('error', message, data),
};