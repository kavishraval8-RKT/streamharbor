import { Client } from 'minio';

// Read all MinIO connection info from environment variables
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!, 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

/**
 * This function runs on server startup to ensure
 * our required buckets exist.
 */
export const setupMinIO = async () => {
  console.log('Checking MinIO buckets...');
  const buckets = [
    'raw-uploads', // For original uploaded files
    'processed-media', // For HLS streams and thumbnails
    'processed', // For custom thumbnails
  ];

  try {
    for (const bucket of buckets) {
      const bucketExists = await minioClient.bucketExists(bucket);
      if (!bucketExists) {
        await minioClient.makeBucket(bucket);
        console.log(`Creating bucket: ${bucket}`);
      }
    }
    console.log('✅ MinIO connection successful and buckets ensured.');
  } catch (err) {
    console.error('Error setting up MinIO:', err);
    process.exit(1);
  }
};

export default minioClient;