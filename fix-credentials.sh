#!/bin/bash
# Fix MinIO credentials mismatch

echo "=== Stopping all services ==="
docker-compose down

echo ""
echo "=== Checking current .env file ==="
cat .env | grep MINIO_ROOT

echo ""
echo "=== The .env file on server has wrong credentials ==="
echo "=== Updating .env to match what backend expects ==="

# Backup current .env
cp .env .env.backup

# Update MinIO credentials in .env
sed -i 's/MINIO_ROOT_USER=minioadmin/MINIO_ROOT_USER=streamharboradmin/g' .env
sed -i 's/MINIO_ROOT_PASSWORD=minioadmin123/MINIO_ROOT_PASSWORD=supersecretpassword/g' .env
sed -i 's/MINIO_ACCESS_KEY=minioadmin/MINIO_ACCESS_KEY=streamharboradmin/g' .env
sed -i 's/MINIO_SECRET_KEY=minioadmin123/MINIO_SECRET_KEY=supersecretpassword/g' .env

echo ""
echo "=== Updated .env file ==="
cat .env | grep MINIO_ROOT

echo ""
echo "=== Starting services with correct credentials ==="
docker-compose up -d

echo ""
echo "=== Waiting 15 seconds ==="
sleep 15

echo ""
echo "=== Status ==="
docker-compose ps

echo ""
echo "=== Backend logs ==="
docker-compose logs backend | tail -20
