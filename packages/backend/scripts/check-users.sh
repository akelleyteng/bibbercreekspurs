#!/bin/bash
set -e

echo "==> Checking imported users in database..."

# Get the database password from Google Cloud Secret Manager
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")

# Detect architecture
if [[ $(uname -m) == "arm64" ]]; then
    ARCH="darwin.arm64"
else
    ARCH="darwin.amd64"
fi

# Download Cloud SQL Proxy if not present
if [ ! -f cloud-sql-proxy ]; then
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.${ARCH}
    chmod +x cloud-sql-proxy
fi

# Get the connection name
CONNECTION_NAME=$(gcloud sql instances describe hclub-db --format="value(connectionName)")

# Start Cloud SQL Proxy
./cloud-sql-proxy ${CONNECTION_NAME} --port=5433 &
PROXY_PID=$!
sleep 3

# Query users
echo -e "\n📊 User Statistics:"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5433 -U hclub_user -d hclub << EOF
SELECT
    role,
    COUNT(*) as count,
    SUM(CASE WHEN password_reset_required THEN 1 ELSE 0 END) as requires_reset
FROM users
GROUP BY role;

\echo
\echo '📋 Recent Users (last 10):'
SELECT
    email,
    first_name,
    last_name,
    role,
    password_reset_required,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
EOF

kill $PROXY_PID
echo -e "\n==> Check complete!"
