import { NextRequest, NextResponse } from 'next/server';

import { auth } from "@/auth";

export const runtime = 'edge';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
};

function sanitizeError(e: unknown): never {
  if (e instanceof Error) console.error("Upload error:", e.message);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 }) as never;
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

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return NextResponse.json({ error: "File type not allowed" }, { status: 400 });

    const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;
    if (!bucket) {
      console.error("R2 BUCKET BINDING MISSING in env");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'bin';
    const key = `uploads/${crypto.randomUUID()}.${ext}`;
    
    await bucket.put(key, buffer, {
      httpMetadata: { contentType: file.type }
    });

    const baseUrl = process.env.R2_PUBLIC_URL || `https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev`;
    const publicUrl = `${baseUrl}/${key}`;

    return NextResponse.json({ success: true, publicUrl });
  } catch (error: unknown) {
    return sanitizeError(error);
  }
}
