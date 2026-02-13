#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/run-migration.sh <migration-file>"
    echo "Example: ./scripts/run-migration.sh migrations/014_add_password_reset_required.sql"
    exit 1
fi

MIGRATION_FILE="$1"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "==> Running migration: $MIGRATION_FILE"

# Get the database password from Google Cloud Secret Manager
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")

# Detect architecture (Apple Silicon vs Intel)
if [[ $(uname -m) == "arm64" ]]; then
    ARCH="darwin.arm64"
else
    ARCH="darwin.amd64"
fi

# Download Cloud SQL Proxy if not present
if [ ! -f cloud-sql-proxy ]; then
    echo "Downloading Cloud SQL Proxy..."
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.${ARCH}
    chmod +x cloud-sql-proxy
fi

# Get the connection name
CONNECTION_NAME=$(gcloud sql instances describe hclub-db --format="value(connectionName)")

# Start Cloud SQL Proxy in the background
./cloud-sql-proxy ${CONNECTION_NAME} --port=5433 &
PROXY_PID=$!

# Wait for proxy to be ready
sleep 3

# URL encode the password to handle special characters
DB_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${DB_PASSWORD}', safe=''))")

# Run the migration
echo "Executing SQL migration..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5433 -U hclub_user -d hclub -f "$MIGRATION_FILE"

# Kill the Cloud SQL Proxy
kill $PROXY_PID

echo "==> Migration completed successfully!"
