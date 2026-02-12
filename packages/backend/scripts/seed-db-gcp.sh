#!/bin/bash

# Seed database on Cloud SQL

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
DB_INSTANCE_NAME="hclub-db"
CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE_NAME" --format="get(connectionName)")

if [ -z "$PROJECT_ID" ]; then
    print_error "GCP_PROJECT_ID environment variable is not set."
    exit 1
fi

print_message "Seeding database on Cloud SQL..."

# Start Cloud SQL Proxy
if [ ! -f "./cloud-sql-proxy" ]; then
    print_message "Downloading Cloud SQL Proxy..."
    # Detect architecture (Apple Silicon vs Intel)
    if [[ $(uname -m) == "arm64" ]]; then
        ARCH="darwin.arm64"
    else
        ARCH="darwin.amd64"
    fi
    curl -o cloud-sql-proxy "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.${ARCH}"
    chmod +x cloud-sql-proxy
fi

./cloud-sql-proxy --port 5433 "$CONNECTION_NAME" &
PROXY_PID=$!
sleep 5

# Get database password
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")

# URL encode the password to handle special characters
DB_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${DB_PASSWORD}', safe=''))")

# Set DATABASE_URL with encoded password (using port 5433)
export DATABASE_URL="postgresql://hclub_user:${DB_PASSWORD_ENCODED}@localhost:5433/hclub"

print_message "Seeding database..."
npm run seed

# Kill the proxy
kill $PROXY_PID

print_message "Database seeded successfully!"
print_message "Admin credentials: admin@bibbercreekspurs4h.org / Admin123!"
print_message "⚠️  IMPORTANT: Change the admin password after first login!"
