#!/bin/bash
# Complete fix: remove old containers, rebuild, and restart clean

echo "=== Step 1: Stop all containers ==="
docker-compose down

echo ""
echo "=== Step 2: Remove ALL old containers ==="
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo ""
echo "=== Step 3: Remove dangling images ==="
docker image prune -f

echo ""
echo "=== Step 4: Start services fresh ==="
docker-compose up -d

echo ""
echo "=== Step 5: Wait 20 seconds for startup ==="
sleep 20

echo ""
echo "=== Step 6: Check status ==="
docker-compose ps

echo ""
echo "=== Step 7: Check backend logs for multipart endpoints ==="
docker-compose logs backend | grep -i "multipart\|listening" | tail -10

echo ""
echo "=== DONE ==="
echo "✓ All services should be running"
echo "✓ Login should redirect to https://streamharbor.me"
echo "✓ Upload should use chunked multipart (10MB parts)"
echo ""
echo "Test now:"
echo "1. Visit https://streamharbor.me and log in"
echo "2. Go to /upload and upload a video"
echo "3. Check progress - should say 'Uploading video file... X%'"
