#!/bin/bash
# Emergency diagnostic script - run this on the server

echo "=== Container Status ==="
docker-compose ps

echo -e "\n=== Backend Logs ==="
docker-compose logs backend 2>&1

echo -e "\n=== Frontend Logs ==="
docker-compose logs frontend 2>&1

echo -e "\n=== MinIO Logs ==="
docker-compose logs minio 2>&1

echo -e "\n=== Worker Logs ==="
docker-compose logs worker 2>&1
