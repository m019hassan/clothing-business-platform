import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * The S3-compatible driver for uploads (Cloudflare R2, Supabase Storage, MinIO or AWS).
 * Configuration comes from the environment:
 *   STORAGE_DRIVER=s3
 *   S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_REGION (default "auto"), S3_ENDPOINT (for R2/Supabase/MinIO), S3_PREFIX (default "uploads/")
 */
export type S3Driver = {
  put: (key: string, data: Buffer, contentType: string) => Promise<void>;
  get: (key: string) => Promise<Buffer | null>;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`${name} is required when STORAGE_DRIVER=s3.`);
  }

  return value;
}

export function createS3Driver(): S3Driver {
  const bucket = requireEnv("S3_BUCKET");
  const prefix = process.env.S3_PREFIX ?? "uploads/";

  const client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  return {
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${prefix}${key}`,
          Body: data,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `${prefix}${key}` }));

        if (!response.Body) {
          return null;
        }

        const bytes = await response.Body.transformToByteArray();

        return Buffer.from(bytes);
      } catch (error) {
        if (typeof error === "object" && error !== null && "name" in error && error.name === "NoSuchKey") {
          return null;
        }

        throw error;
      }
    },
  };
}
