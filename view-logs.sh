#!/bin/bash
# View Cloud Run logs for debugging

echo "Fetching latest Cloud Run logs..."
echo ""

gcloud run services logs read hclub-backend \
  --region us-central1 \
  --project bibbercreekspurs-4h \
  --limit 100 \
  --format="table(timestamp,severity,textPayload)"
