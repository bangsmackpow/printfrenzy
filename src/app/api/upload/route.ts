import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";

export const runtime = 'edge';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
};

async function sanitizeError(e: unknown, context: Record<string, any> = {}): Promise<NextResponse> {
  const message = e instanceof Error ? e.message : "Unknown error";
  await log.error("Upload process failed", { error: message, ...context });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return true;
  for (const pattern of expected) {
    let match = true;
    for (let i = 0; i < pattern.length; i++) {
      if (bytes[i] !== pattern[i]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      httpMetadata: { contentType: file.type }
    });

    const baseUrl = process.env.R2_PUBLIC_URL || `https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev`;
    const publicUrl = `${baseUrl}/${key}`;

    await log.info("Upload successful", { ...fileContext, key, publicUrl });

    return NextResponse.json({ success: true, publicUrl });
  } catch (error: unknown) {
    return sanitizeError(error, { user: userEmail });
  }
}

