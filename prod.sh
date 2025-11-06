#!/bin/bash
# Helper script for production docker-compose commands
# Always use both config files for production!

case "$1" in
  up)
    echo "Starting production services..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    ;;
  down)
    echo "Stopping production services..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    ;;
  restart)
    echo "Restarting production services..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart
    ;;
  ps)
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    ;;
  logs)
    if [ -z "$2" ]; then
      echo "Usage: ./prod.sh logs <service> [lines]"
      echo "Example: ./prod.sh logs backend 50"
      exit 1
    fi
    LINES=${3:-50}
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs "$2" | tail -n "$LINES"
    ;;
  build)
    echo "Building production images..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    ;;
  *)
    echo "StreamHarbor Production Helper"
    echo "Usage: ./prod.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up        - Start all services"
    echo "  down      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  ps        - Show service status"
    echo "  logs      - Show logs: ./prod.sh logs <service> [lines]"
    echo "  build     - Rebuild images"
    echo ""
    echo "Examples:"
    echo "  ./prod.sh up"
    echo "  ./prod.sh logs backend 30"
    echo "  ./prod.sh ps"
    ;;
esac
