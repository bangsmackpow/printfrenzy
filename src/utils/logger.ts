/**
 * Lightweight logger for Axiom integration in Cloudflare Workers / Edge Runtime.
 * No heavy dependencies, just standard fetch.
 *
 * Events are buffered and flushed in batches so that logging never blocks the
 * request/response path and each HTTP request to Axiom carries many events.
 */

const FLUSH_INTERVAL_MS = 500;
const MAX_BUFFER_SIZE = 50;

let buffer: Record<string, any>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export const log = {
  async info(message: string, data: Record<string, any> = {}) {
    enqueue('info', message, data);
  },
  async error(message: string, data: Record<string, any> = {}) {
    enqueue('error', message, data);
  },
  async warn(message: string, data: Record<string, any> = {}) {
    enqueue('warn', message, data);
  }
};

function enqueue(level: string, message: string, data: Record<string, any>) {
  const dataset = process.env.AXIOM_DATASET;
  const token = process.env.AXIOM_TOKEN;

  if (!dataset || !token) {
    // Fallback to console if Axiom is not configured
    (console as any)[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}`, data);
    return;
  }

  buffer.push({
    _time: new Date().toISOString(),
    level,
    message,
    ...data,
    project: 'printfrenzy',
    runtime: 'edge-cloudflare'
  });

  // Flush once the buffer is large enough or on an interval. Fire-and-forget:
  // we do not await the fetch so logging never blocks the response.
  if (buffer.length >= MAX_BUFFER_SIZE) {
    void flush(dataset, token);
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush(dataset, token);
    }, FLUSH_INTERVAL_MS);
  }
}

async function flush(dataset: string, token: string) {
  if (buffer.length === 0) return;
  const events = buffer;
  buffer = [];

  try {
    await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(events)
    });
  } catch (e) {
    // Do not rethrow: logging must never break the request path.
    console.error("Failed to send logs to Axiom:", e);
  }
}
