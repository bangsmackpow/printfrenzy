/**
 * Lightweight logger for Axiom integration in Cloudflare Workers / Edge Runtime.
 * No heavy dependencies, just standard fetch.
 */

export const log = {
  async info(message: string, data: Record<string, any> = {}) {
    await sendToAxiom('info', message, data);
  },
  async error(message: string, data: Record<string, any> = {}) {
    await sendToAxiom('error', message, data);
  },
  async warn(message: string, data: Record<string, any> = {}) {
    await sendToAxiom('warn', message, data);
  }
};

async function sendToAxiom(level: string, message: string, data: Record<string, any>) {
  const dataset = process.env.AXIOM_DATASET;
  const token = process.env.AXIOM_TOKEN;

  if (!dataset || !token) {
    // Fallback to console if Axiom is not configured
    console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}`, data);
    return;
  }

  const payload = [{
    _time: new Date().toISOString(),
    level,
    message,
    ...data,
    project: 'printfrenzy',
    runtime: 'edge-cloudflare'
  }];

  try {
    // We don't await the fetch if we want to be fast, 
    // but in a Worker we should use ctx.waitUntil if available.
    // For Next.js Edge routes, standard fetch is fine.
    await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("Failed to send log to Axiom:", e);
  }
}
