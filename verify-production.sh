#!/bin/bash
# Verification script - check all critical components

echo "======================================"
echo "StreamHarbor Production Verification"
echo "======================================"
echo ""

echo "1. Checking container status..."
docker-compose ps
echo ""

echo "2. Checking backend multipart endpoints..."
docker-compose logs backend 2>&1 | grep -i "listening\|multipart" | tail -5
echo ""

echo "3. Checking MinIO credentials match..."
echo "Backend expects:"
docker-compose exec backend env 2>/dev/null | grep MINIO_ACCESS_KEY || echo "  (backend not running)"
echo "MinIO has:"
docker-compose exec minio env 2>/dev/null | grep MINIO_ROOT_USER || echo "  (minio not running)"
echo ""

echo "4. Testing backend health..."
curl -s http://localhost:8080/ || echo "Backend not responding"
echo ""

echo "5. Testing multipart initiate endpoint..."
curl -s -X POST http://localhost:8080/api/multipart/initiate \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.mp4","contentType":"video/mp4"}' | head -c 200
echo ""
echo ""

echo "6. Checking frontend environment..."
docker-compose exec frontend env 2>/dev/null | grep -E "NEXTAUTH_URL|NEXT_PUBLIC" || echo "  (frontend not running)"
echo ""

echo "======================================"
echo "Verification complete!"
echo ""
echo "✓ If all containers are 'Up', proceed to test in browser"
echo "✓ Login at https://streamharbor.me"
echo "✓ Upload a video at https://streamharbor.me/upload"
echo ""
echo "If upload fails, check:"
echo "  docker-compose logs backend | tail -50"
echo "  docker-compose logs frontend | tail -50"
echo "======================================"
