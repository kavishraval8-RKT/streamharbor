#!/bin/bash
# Quick fix - remove old containers and restart

echo "=== Stopping all containers ==="
docker-compose down

echo ""
echo "=== Removing old backend and worker containers ==="
docker rm -f $(docker ps -aq --filter "name=streamharbor_backend") 2>/dev/null || true
docker rm -f $(docker ps -aq --filter "name=streamharbor_worker") 2>/dev/null || true

echo ""
echo "=== Starting services ==="
docker-compose up -d

echo ""
echo "=== Waiting 10 seconds ==="
sleep 10

echo ""
echo "=== Status ==="
docker-compose ps

echo ""
echo "=== Backend logs ==="
docker-compose logs backend | tail -20
