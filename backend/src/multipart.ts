import { S3Client, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION || 'us-east-1';

// Internal S3 client for operations (talks to MinIO directly)
export function getS3Internal() {
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const endpoint = `${useSSL ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
  return new S3Client({
    endpoint,
    region: REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || '',
      secretAccessKey: process.env.MINIO_SECRET_KEY || '',
    },
  });
}

// Public S3 client for presigning (generates browser-accessible URLs)
export function getS3Public() {
  const publicUrl = process.env.MINIO_PUBLIC_URL || 'https://minio.streamharbor.me';
  return new S3Client({
    endpoint: publicUrl,
    region: REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || '',
      secretAccessKey: process.env.MINIO_SECRET_KEY || '',
    },
  });
}

export async function initiateMultipartUpload(bucket: string, key: string, contentType?: string) {
  const s3 = getS3Internal(); // Use internal endpoint for actual operations
  const cmd = new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const res = await s3.send(cmd);
  return res.UploadId!;
}

export async function presignPartUrl(bucket: string, key: string, uploadId: string, partNumber: number, expiresSeconds = 7200) {
  const s3 = getS3Public(); // Use public endpoint for presigning URLs
  const cmd = new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber, Body: new Uint8Array() });
  // Body is ignored for signing; MinIO/S3 only need method, path, query.
  const url = await getSignedUrl(s3 as any, cmd as any, { expiresIn: expiresSeconds });
  return url;
}

export async function completeMultipartUpload(bucket: string, key: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
  const s3 = getS3Internal(); // Use internal endpoint for actual operations
  const cmd = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts.sort((a,b)=>a.PartNumber-b.PartNumber) },
  });
  await s3.send(cmd);
}

export async function abortMultipartUpload(bucket: string, key: string, uploadId: string) {
  const s3 = getS3Internal(); // Use internal endpoint for actual operations
  const cmd = new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId });
  await s3.send(cmd);
}
