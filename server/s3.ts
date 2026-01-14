import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function generateUploadUrl(
  userId: number,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileKey: string; fileUrl: string }> {
  const fileExtension = fileName.split(".").pop();
  const fileKey = `uploads/${userId}/${nanoid()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  return { uploadUrl, fileKey, fileUrl };
}

/**
 * Generate a presigned URL for downloading a file from S3
 */
export async function generateDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Upload a file directly to S3 (for server-side uploads)
 */
export async function uploadToS3(
  fileKey: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
}

/**
 * Extract file key from S3 URL
 */
export function extractFileKeyFromUrl(fileUrl: string): string {
  const url = new URL(fileUrl);
  return url.pathname.substring(1); // Remove leading slash
}
