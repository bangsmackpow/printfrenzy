import { S3Client } from "@aws-sdk/client-s3";

export const getR2Client = () => {
  // Accessing process.env inside the function ensures it works with Cloudflare's nodejs_compat
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
};