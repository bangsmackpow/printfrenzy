import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";
import { generateTraceId } from "@/utils/trace";
import { isRateLimited } from "@/utils/rateLimiter";
import { R2_PUBLIC_URL } from "@/utils/config";

export const runtime = 'edge';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/png', 
  'image/jpeg', 
  'image/webp', 
  'image/gif', 
  'application/pdf', 
  'image/heic', 
  'image/heif', 
  'image/avif', 
  'image/svg+xml', 
  'image/bmp', 
  'image/tiff'
];
// Each mime maps to a list of acceptable signatures. A signature is a byte pattern
// plus the offset it must appear at (webp's "WEBP" tag lives at byte 8, not 0).
type MagicSignature = { bytes: number[]; offset: number };
const MAGIC_BYTES: Record<string, MagicSignature[]> = {
  'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 }],
  'image/jpeg': [{ bytes: [0xff, 0xd8, 0xff], offset: 0 }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  'image/gif': [{ bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }],
  'image/bmp': [{ bytes: [0x42, 0x4d], offset: 0 }],
  'image/tiff': [{ bytes: [0x49, 0x49, 0x2a, 0x00], offset: 0 }, { bytes: [0x4d, 0x4d, 0x00, 0x2a], offset: 0 }],
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }], // %PDF
};

async function sanitizeError(e: unknown, context: Record<string, any> = {}): Promise<NextResponse> {
  const traceId = generateTraceId();
  const message = e instanceof Error ? e.message : "Unknown error";
  await log.error("Upload process failed", { traceId, error: message, ...context });
  return NextResponse.json({ error: "Internal server error", traceId }, { status: 500 });
}

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  // Bypass complex/variable containers that can't be reliably sniffed by prefix.
  if (
    mimeType === 'image/heic' || 
    mimeType === 'image/heif' || 
    mimeType === 'image/avif' || 
    mimeType === 'image/svg+xml'
  ) return true;

  const bytes = new Uint8Array(buffer);
  const signatures = MAGIC_BYTES[mimeType];
  // Fail-closed: any whitelisted type we don't have a signature for is rejected,
  // rather than accepted because a client lied about its content-type.
  if (!signatures) return false;

  // webp must match BOTH the RIFF prefix and the WEBP tag; other types have a
  // single required signature, so matching any entry is sufficient.
  const allMatch = (sigs: MagicSignature[]) => sigs.every((sig) => {
    for (let i = 0; i < sig.bytes.length; i++) {
      if (bytes[sig.offset + i] !== sig.bytes[i]) return false;
    }
    return true;
  });

  if (mimeType === 'image/webp') {
    return allMatch(signatures);
  }
  return signatures.some((sig) => allMatch([sig]));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = (process.env as unknown as { DB: D1Database }).DB;
  if (db) {
    const limited = await isRateLimited(db, req, "upload", 10, 60); // 10 uploads per 60s
    if (limited) {
      return NextResponse.json({ error: "Too many upload requests. Please wait a minute." }, { status: 429 });
    }
  }

  const userEmail = session.user?.email || "unknown";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      await log.warn("Upload attempt with no file", { user: userEmail });
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileContext = {
      filename: file.name,
      size: file.size,
      type: file.type,
      user: userEmail
    };

    await log.info("Upload started", fileContext);

    if (file.size > MAX_FILE_SIZE) {
      await log.warn("Upload rejected: File too large", fileContext);
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)` }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      await log.warn("Upload rejected: Invalid type", fileContext);
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;
    if (!bucket) {
      await log.error("R2 Bucket binding missing", fileContext);
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type)) {
      await log.warn("Upload rejected: Magic byte mismatch", fileContext);
      return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'bin';
    const key = `uploads/${crypto.randomUUID()}.${ext}`;
    
    await bucket.put(key, buffer, {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' }
    });

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    await log.info("Upload successful", { ...fileContext, key, publicUrl });

    return NextResponse.json({ success: true, publicUrl });
  } catch (error: unknown) {
    return sanitizeError(error, { user: userEmail });
  }
}

