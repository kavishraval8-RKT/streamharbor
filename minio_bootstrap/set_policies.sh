#!/bin/sh

echo "MinIO startup detected. Waiting 10 seconds for stability..."
sleep 10 

MINIO_URL="http://127.0.0.1:9000"
HEALTH_ENDPOINT="${MINIO_URL}/minio/health/live"

echo "Waiting for MinIO server to be ready at ${HEALTH_ENDPOINT}..."

until curl -s -f ${HEALTH_ENDPOINT} > /dev/null; do
    echo "MinIO not ready yet. Retrying in 3 seconds..."
    sleep 3
done

echo "MinIO server is ready. Setting alias..."

mc alias set myminio ${MINIO_URL} ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

echo "MinIO alias set successfully. Configuring buckets..."

mc mb myminio/raw-uploads || true
mc mb myminio/processed-media || true
# Bucket for custom thumbnails uploaded from UI
mc mb myminio/processed || true

echo "Setting CORS rules..."
mc cors set myminio/raw-uploads /bootstrap_config/cors.xml
mc cors set myminio/processed-media /bootstrap_config/cors.xml
mc cors set myminio/processed /bootstrap_config/cors.xml

echo "Setting bucket policies..."
# Set bucket policies using the policy file
mc policy set-json /bootstrap_config/policy.json myminio/raw-uploads
mc policy set-json /bootstrap_config/policy.json myminio/processed-media
mc policy set-json /bootstrap_config/policy.json myminio/processed

# Set bucket to be publicly accessible for uploads and downloads
mc anonymous set upload myminio/raw-uploads
mc anonymous set download myminio/processed-media
mc anonymous set download myminio/processed

echo "MinIO buckets and policies configured."
exit 0