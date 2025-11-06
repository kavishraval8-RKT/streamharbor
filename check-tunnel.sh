#!/bin/bash
# Check Cloudflare Tunnel and nginx settings

echo "=== Checking Cloudflare Tunnel status ==="
sudo systemctl status cloudflared | head -20

echo ""
echo "=== Checking nginx config (if exists) ==="
if [ -f /etc/nginx/nginx.conf ]; then
  cat /etc/nginx/nginx.conf | grep -i "client_max_body_size\|proxy_timeout"
fi

echo ""
echo "=== Checking Cloudflare Tunnel config ==="
if [ -f ~/.cloudflared/config.yml ]; then
  cat ~/.cloudflared/config.yml
elif [ -f /etc/cloudflared/config.yml ]; then
  sudo cat /etc/cloudflared/config.yml
fi

echo ""
echo "=== Test direct backend upload (bypass Cloudflare) ==="
echo "curl -X POST http://localhost:8080/api/upload-file -F 'file=@test-small.txt'"
curl -X POST http://localhost:8080/api/upload-file -F 'file=@test-small.txt'
