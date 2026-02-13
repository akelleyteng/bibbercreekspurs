#!/bin/bash
set -e

echo "==> Adding admin user to Cloud SQL database..."

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

# Set DATABASE_URL with encoded password (using port 5433)
export DATABASE_URL="postgresql://hclub_user:${DB_PASSWORD_ENCODED}@localhost:5433/hclub"

# Run the add admin script
echo "Creating admin user..."
npx ts-node scripts/add-admin-user.ts

# Kill the Cloud SQL Proxy
kill $PROXY_PID

echo "==> Admin user added successfully!"
