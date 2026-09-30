#!/bin/bash
# Debug backend build

echo "=== Building backend image ==="
cd ~/streamharbor
docker-compose build backend 2>&1 | tee backend-build.log

echo ""
echo "=== Inspecting built image ==="
docker run --rm streamharbor_backend:latest ls -la /app/

echo ""
echo "=== Checking dist folder ==="
docker run --rm streamharbor_backend:latest ls -la /app/dist/

echo ""
echo "=== Checking if server.js exists ==="
docker run --rm streamharbor_backend:latest test -f /app/dist/server.js && echo "✓ server.js EXISTS" || echo "✗ server.js MISSING"

echo ""
echo "=== Trying to run the server ==="
docker run --rm streamharbor_backend:latest node dist/server.js 2>&1 | head -20
