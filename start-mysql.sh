#!/bin/bash
# Start the MySQL test server in Docker
# Uses port 23306 to avoid conflicts with any local MySQL instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting MySQL test server on port 23306..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d

echo "Waiting for MySQL to be ready..."
until docker compose -f "${SCRIPT_DIR}/docker-compose.yml" exec -T mysql-test mysqladmin ping -h localhost -u root -p1234567890 --silent 2>/dev/null; do
	sleep 2
	echo "  ...still waiting"
done

echo "MySQL test server is ready on port 23306"
echo "  Host: 127.0.0.1"
echo "  Port: 23306"
echo "  User: root"
echo "  Password: 1234567890"
echo "  Database: bookstore"
