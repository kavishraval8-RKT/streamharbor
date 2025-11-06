#!/bin/bash
# Complete rebuild script - destroys everything and rebuilds from scratch

set -e  # Exit on any error

echo "=== STEP 1: Pull latest code ==="
git pull origin main

echo ""
echo "=== STEP 2: Stop all containers ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

echo ""
echo "=== STEP 3: Remove ALL StreamHarbor images ==="
docker images | grep streamharbor | awk '{print $3}' | xargs -r docker rmi -f

echo ""
echo "=== STEP 4: Clean Docker system (keeping volumes) ==="
docker system prune -af

echo ""
echo "=== STEP 5: Build with NO CACHE ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache --pull

echo ""
echo "=== STEP 6: Start services ==="
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "=== STEP 7: Wait for startup ==="
sleep 30

echo ""
echo "=== STEP 8: Check status ==="
docker-compose ps

echo ""
echo "=== Done! Check logs if needed ==="
echo "docker-compose logs backend --tail 50"
echo "docker-compose logs frontend --tail 50"
echo "docker-compose logs minio --tail 20"
