#!/bin/bash
# Rebuild frontend with production environment variables

echo "=== Stopping frontend ==="
docker-compose stop frontend

echo ""
echo "=== Removing old frontend container and image ==="
docker rm -f streamharbor_frontend_1 2>/dev/null || true
docker rmi streamharbor_frontend 2>/dev/null || true

echo ""
echo "=== Rebuilding frontend with production env vars ==="
docker-compose build --no-cache frontend

echo ""
echo "=== Starting all services ==="
docker-compose up -d

echo ""
echo "=== Waiting 15 seconds ==="
sleep 15

echo ""
echo "=== Status ==="
docker-compose ps

echo ""
echo "=== Frontend should now have correct URLs ==="
echo "Test by visiting: https://streamharbor.me"
echo "After login, it should stay on streamharbor.me (not redirect to :3000)"
echo "Upload should work without network errors"
