import { NextRequest, NextResponse } from 'next/server';

import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string || file.name;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;
    if (!bucket) {
      console.error("R2 BUCKET BINDING MISSING in env");
      return NextResponse.json({ error: "R2 Environment binding missing" }, { status: 500 });
    }

    const key = `uploads/${Date.now()}-${fileName}`;
    
    // Put file into R2 using the binding
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    // Public URL (requires a custom domain or public bucket URL)
    const publicUrl = `https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev/${key}`; 

    return NextResponse.json({ success: true, publicUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}