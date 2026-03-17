import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/utils/r2Client";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { contentType, fileName } = await req.json();
  const key = `uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });
  // This is the URL we will store in D1
  const publicUrl = `https://assets.printfrenzy.com/${key}`; 

  return NextResponse.json({ signedUrl, publicUrl });
}