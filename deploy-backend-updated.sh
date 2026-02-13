#!/bin/bash
# Two-step deployment for monorepo backend

set -e

PROJECT_ID="bibbercreekspurs-4h"
REGION="us-central1"
SERVICE_NAME="hclub-backend"
CONNECTION_NAME="bibbercreekspurs-4h:us-central1:hclub-db"

echo "Starting deployment from repo root..."
echo "Current directory: $(pwd)"

# Step 1: Build the container image using cloudbuild.yaml
echo ""
echo "Step 1: Building container image with Cloud Build..."
gcloud builds submit \
    --config=cloudbuild.yaml \
    --project="$PROJECT_ID" \
    --timeout=20m \
    .

# Step 2: Deploy to Cloud Run using the pre-built image
echo ""
echo "Step 2: Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --service-account "hclub-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --add-cloudsql-instances "$CONNECTION_NAME" \
    --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://bibbercreekspurs4h.org" \
    --set-secrets "DATABASE_URL=database-url:latest,JWT_ACCESS_SECRET=jwt-access-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next: Test the password reset flow at https://bibbercreekspurs4h.org/login"
