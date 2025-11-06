#!/bin/bash
# Quick status check script for the server

echo "=== Container Status ==="
docker ps -a | grep streamharbor

echo -e "\n=== Backend Logs (last 30 lines) ==="
docker logs streamharbor_backend_1 --tail 30 2>&1 || echo "Backend container not found"

echo -e "\n=== Frontend Logs (last 30 lines) ==="
docker logs streamharbor_frontend_1 --tail 30 2>&1 || echo "Frontend container not found"

echo -e "\n=== MinIO Logs (last 20 lines) ==="
docker logs streamharbor_minio_1 --tail 20 2>&1 || echo "MinIO container not found"

echo -e "\n=== Worker Logs (last 20 lines) ==="
docker logs streamharbor_worker_1 --tail 20 2>&1 || echo "Worker container not found"

echo -e "\n=== Health Check ==="
docker inspect streamharbor_backend_1 2>/dev/null | grep -A 10 "Health" || echo "No backend health info"
docker inspect streamharbor_frontend_1 2>/dev/null | grep -A 10 "Health" || echo "No frontend health info"
