#!/bin/bash

# Check Cloud Run service configuration
echo "Checking Cloud Run service configuration..."
echo ""

PROJECT_ID="bibbercreekspurs-4h"
SERVICE_NAME="hclub-backend"
REGION="us-central1"

echo "=== Service Details ==="
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format="table(status.url,spec.template.spec.serviceAccountName,spec.template.spec.containers[0].image)"

echo ""
echo "=== Environment Variables ==="
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format="value(spec.template.spec.containers[0].env)"

echo ""
echo "=== Secrets ==="
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format="value(spec.template.spec.containers[0].env)"

echo ""
echo "=== Cloud SQL Instances ==="
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])"

echo ""
echo "=== Recent Logs (last 20 lines) ==="
gcloud run services logs read $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --limit 20
