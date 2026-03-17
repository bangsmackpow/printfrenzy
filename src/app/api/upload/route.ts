import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/utils/r2Client";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { contentType, fileName } = await req.json();
    
    if (!process.env.R2_BUCKET_NAME || !process.env.ACCOUNT_ID) {
      return NextResponse.json({ error: "R2 Environment variables missing" }, { status: 500 });
    }

    const client = getR2Client(); // Initialize here
    
    const key = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 });
    const publicUrl = `https://assets.builtnetworks.com/${key}`; 

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Upload signature error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}