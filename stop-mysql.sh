#!/bin/bash
# Stop and remove the MySQL test server Docker container

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping MySQL test server..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" down -v

echo "MySQL test server stopped and volumes removed."
