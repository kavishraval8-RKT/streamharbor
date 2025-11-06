#!/bin/bash
# Check MinIO credentials and setup

echo "=== Checking MinIO environment variables ==="
docker-compose exec minio env | grep MINIO

echo ""
echo "=== Checking backend environment variables ==="
docker-compose exec backend env | grep MINIO

echo ""
echo "=== MinIO logs ==="
docker-compose logs minio | tail -30
