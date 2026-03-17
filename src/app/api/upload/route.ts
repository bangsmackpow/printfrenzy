import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { fileName, fileType } = await req.json();
  
  // Cloudflare R2 uses the S3 API
  const S3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const key = `orders/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
  const publicUrl = `https://assets.printfrenzy.com/${key}`; // Your R2 Public Domain

  return NextResponse.json({ uploadUrl, publicUrl });
}