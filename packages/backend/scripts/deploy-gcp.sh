#!/bin/bash

# GCP Deployment Script for 4H Club Backend
# This script automates the entire deployment process to Google Cloud Platform

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="hclub-backend"
DB_INSTANCE_NAME="hclub-db"
DB_NAME="hclub"
DB_USER="hclub_user"
CLOUD_RUN_SERVICE_ACCOUNT="hclub-backend-sa"

# Function to print colored messages
print_message() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    print_error "GCP_PROJECT_ID environment variable is not set."
    echo "Please set it with: export GCP_PROJECT_ID=your-project-id"
    exit 1
fi

print_message "Starting deployment to Google Cloud Platform..."
print_message "Project ID: $PROJECT_ID"
print_message "Region: $REGION"

# Step 1: Set the project
print_message "Setting GCP project..."
gcloud config set project "$PROJECT_ID"

# Step 2: Enable required APIs
print_message "Enabling required GCP APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    vpcaccess.googleapis.com

print_message "Waiting for APIs to be fully enabled (this may take a minute)..."
sleep 30

# Step 3: Create service account for Cloud Run
print_message "Creating service account for Cloud Run..."
if ! gcloud iam service-accounts describe "${CLOUD_RUN_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" &> /dev/null; then
    gcloud iam service-accounts create "$CLOUD_RUN_SERVICE_ACCOUNT" \
        --display-name "4H Club Backend Service Account"
else
    print_warning "Service account already exists, skipping..."
fi

# Step 4: Check if Cloud SQL instance exists
print_message "Checking Cloud SQL instance..."
if gcloud sql instances describe "$DB_INSTANCE_NAME" &> /dev/null; then
    print_warning "Cloud SQL instance already exists, skipping creation..."
else
    print_message "Creating Cloud SQL PostgreSQL instance (this takes 5-10 minutes)..."

    # Generate a random password
    DB_PASSWORD=$(openssl rand -base64 32)

    # Create the instance with public IP (secure via Cloud SQL Proxy)
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region="$REGION"

    # Set the password for postgres user
    gcloud sql users set-password postgres \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD"

    # Create the application database user
    gcloud sql users create "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD"

    # Create the application database
    gcloud sql databases create "$DB_NAME" \
        --instance="$DB_INSTANCE_NAME"

    print_message "Database password has been generated and stored."

    # Store database password in Secret Manager
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
        --data-file=- \
        --replication-policy="automatic" || true
fi

# Step 5: Get database connection name
print_message "Getting Cloud SQL connection name..."
CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE_NAME" --format="get(connectionName)")
print_message "Connection name: $CONNECTION_NAME"

# Step 6: VPC Connector not needed with public IP + Cloud SQL Proxy
# Cloud Run connects via Cloud SQL Proxy using --add-cloudsql-instances
print_message "Skipping VPC Connector (using Cloud SQL Proxy for secure connection)..."

# Step 7: Generate JWT secrets if they don't exist
print_message "Setting up secrets in Secret Manager..."

# Access Token Secret
if ! gcloud secrets describe jwt-access-secret &> /dev/null; then
    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
    echo -n "$JWT_ACCESS_SECRET" | gcloud secrets create jwt-access-secret \
        --data-file=- \
        --replication-policy="automatic"
else
    print_warning "JWT access secret already exists, skipping..."
fi

# Refresh Token Secret
if ! gcloud secrets describe jwt-refresh-secret &> /dev/null; then
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    echo -n "$JWT_REFRESH_SECRET" | gcloud secrets create jwt-refresh-secret \
        --data-file=- \
        --replication-policy="automatic"
else
    print_warning "JWT refresh secret already exists, skipping..."
fi

# Step 8: Grant service account access to secrets
print_message "Granting service account access to secrets..."
for secret in db-password jwt-access-secret jwt-refresh-secret; do
    gcloud secrets add-iam-policy-binding "$secret" \
        --member="serviceAccount:${CLOUD_RUN_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" || true
done

# Step 9: Grant Cloud SQL access
print_message "Granting Cloud SQL access..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CLOUD_RUN_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client" || true

# Step 10: Build and deploy to Cloud Run
print_message "Building container image with Cloud Build..."
cd ../../  # Go to repo root for monorepo context
gcloud builds submit \
    --config=cloudbuild.yaml \
    --timeout=20m \
    .
cd packages/backend  # Return to backend directory

# Step 11: Create DATABASE_URL secret with Cloud SQL Unix socket
print_message "Creating DATABASE_URL secret for Cloud SQL connection..."
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")

# Cloud Run uses Unix socket at /cloudsql/CONNECTION_NAME
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

# Store DATABASE_URL as a secret
echo -n "$DATABASE_URL" | gcloud secrets create database-url \
    --data-file=- \
    --replication-policy="automatic" 2>/dev/null || \
    echo -n "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=-

# Grant access to the service account
gcloud secrets add-iam-policy-binding database-url \
    --member="serviceAccount:${CLOUD_RUN_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" || true

# Step 12: Deploy to Cloud Run
print_message "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --service-account "${CLOUD_RUN_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --add-cloudsql-instances "$CONNECTION_NAME" \
    --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://4hclub.example.com" \
    --set-secrets "DATABASE_URL=database-url:latest,JWT_ACCESS_SECRET=jwt-access-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0

# Step 13: Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="get(status.url)")

print_message "Deployment complete!"
echo ""
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo -e "${GREEN}Health check:${NC} $SERVICE_URL/health"
echo -e "${GREEN}GraphQL endpoint:${NC} $SERVICE_URL/graphql"
echo ""
print_warning "Next steps:"
echo "1. Run migrations: ./scripts/run-migrations-gcp.sh"
echo "2. Seed the database: ./scripts/seed-db-gcp.sh"
echo "3. Test the deployment: curl $SERVICE_URL/health"
echo ""
print_message "Deployment script completed successfully! 🚀"
