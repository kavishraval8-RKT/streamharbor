#!/bin/bash
# Script to inspect what's actually inside the Docker images

echo "=== Inspecting Backend Image ==="
docker run --rm streamharbor_backend:latest ls -la /app/
echo ""
echo "=== Checking if dist folder exists in backend ==="
docker run --rm streamharbor_backend:latest ls -la /app/dist/ 2>&1 || echo "dist folder NOT FOUND"
echo ""

echo "=== Inspecting Frontend Image ==="
docker run --rm streamharbor_frontend:latest ls -la /app/
echo ""

echo "=== Inspecting Worker Image ==="
docker run --rm streamharbor_worker:latest ls -la /app/
echo ""
echo "=== Checking if dist folder exists in worker ==="
docker run --rm streamharbor_worker:latest ls -la /app/dist/ 2>&1 || echo "dist folder NOT FOUND"
