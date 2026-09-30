#!/bin/bash
# Nuclear option - complete cleanup and rebuild

echo "=== Stopping and removing ALL containers ==="
docker-compose down -v --remove-orphans
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

echo ""
echo "=== Removing ALL images ==="
docker rmi $(docker images -q) -f 2>/dev/null || true

echo ""
echo "=== Cleaning Docker system ==="
docker system prune -af --volumes

echo ""
echo "=== Building fresh images ==="
docker-compose build --no-cache --pull

echo ""
echo "=== Starting services ==="
docker-compose up -d

echo ""
echo "=== Waiting 30 seconds for startup ==="
sleep 30

echo ""
echo "=== Status ==="
docker-compose ps

echo ""
echo "=== If still failing, check logs: ==="
echo "docker-compose logs backend | tail -50"
