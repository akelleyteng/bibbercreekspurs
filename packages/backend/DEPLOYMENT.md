# Deployment Guide - Google Cloud Platform

This guide walks you through deploying the 4H Club backend to Google Cloud Platform using automated scripts.

## Prerequisites

1. **Google Cloud Account**
   - Create an account at https://cloud.google.com
   - Enable billing (free tier includes $300 credit)

2. **Install Google Cloud CLI**
   ```bash
   # macOS (using Homebrew)
   brew install --cask google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

3. **Install Docker** (for local testing)
   ```bash
   brew install --cask docker
   ```

## Deployment Steps

### Step 1: Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Login for application default credentials
gcloud auth application-default login
```

### Step 2: Create a Google Cloud Project

```bash
# Create a new project (choose a unique project ID)
gcloud projects create YOUR-PROJECT-ID --name="4H Club"

# Set it as the default project
gcloud config set project YOUR-PROJECT-ID

# Enable billing (required for Cloud Run and Cloud SQL)
# Go to: https://console.cloud.google.com/billing
# and link your project to a billing account
```

### Step 3: Set Environment Variables

```bash
# Export your project ID
export GCP_PROJECT_ID="YOUR-PROJECT-ID"

# Optional: Set a different region (default is us-central1)
export GCP_REGION="us-central1"
```

### Step 4: Make Scripts Executable

```bash
cd /Users/aekelley/Code/bibbercreekspurs/packages/backend

# Make all scripts executable
chmod +x scripts/*.sh
```

### Step 5: Run the Deployment Script

This single script will:
- Enable all required GCP APIs
- Create a Cloud SQL PostgreSQL instance
- Set up Secret Manager for sensitive data
- Build your Docker container
- Deploy to Cloud Run
- Configure networking and permissions

```bash
# Run the deployment (takes 10-15 minutes on first run)
./scripts/deploy-gcp.sh
```

The script will output:
- ✅ Service URL
- ✅ Health check endpoint
- ✅ GraphQL endpoint

### Step 6: Run Database Migrations

```bash
# Run migrations on Cloud SQL
./scripts/run-migrations-gcp.sh
```

### Step 7: Seed the Database

```bash
# Seed with admin user and initial data
./scripts/seed-db-gcp.sh
```

**Default admin credentials:**
- Email: `admin@bibbercreekspurs4h.org`
- Password: `Admin123!`

⚠️ **IMPORTANT**: Change this password immediately after first login!

### Step 8: Test Your Deployment

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe 4hclub-backend --region us-central1 --format="get(status.url)")

# Test health endpoint
curl $SERVICE_URL/health

# Test GraphQL endpoint
curl -X POST $SERVICE_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                    │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Cloud Run      │         │  Cloud SQL       │         │
│  │  (Backend API)   │────────▶│  (PostgreSQL)    │         │
│  │  Auto-scaling    │  VPC    │  db-f1-micro     │         │
│  └──────────────────┘ Connect └──────────────────┘         │
│           │                                                  │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Secret Manager   │                                       │
│  │ - DB Password    │                                       │
│  │ - JWT Secrets    │                                       │
│  └──────────────────┘                                       │
│                                                              │
│  ┌──────────────────┐                                       │
│  │  Cloud Build     │                                       │
│  │  (CI/CD)         │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Cost Estimate

**Free Tier / Minimal Cost:**
- Cloud Run: Free tier (2M requests/month)
- Cloud SQL (db-f1-micro): ~$7-10/month
- Secrets: $0.06 per secret/month
- VPC Connector: ~$8/month

**Total: ~$15-20/month**

## Environment Variables

The deployment automatically configures these environment variables:

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Secret Manager | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret Manager | JWT access token secret |
| `JWT_REFRESH_SECRET` | Secret Manager | JWT refresh token secret |
| `NODE_ENV` | Set by script | Environment (production) |
| `PORT` | Cloud Run | Port (8080) |
| `FRONTEND_URL` | Set by script | CORS origin |

## Updating the Deployment

After making code changes:

```bash
# Simply re-run the deploy script
./scripts/deploy-gcp.sh

# It will rebuild and redeploy automatically
```

## Viewing Logs

```bash
# Stream logs from Cloud Run
gcloud run services logs read 4hclub-backend \
  --region us-central1 \
  --limit 100

# Follow logs in real-time
gcloud run services logs tail 4hclub-backend \
  --region us-central1
```

## Custom Domain Setup

1. Go to Cloud Run console
2. Select your service
3. Click "Manage Custom Domains"
4. Follow instructions to:
   - Verify domain ownership
   - Map custom domain to service
   - Update DNS records

## Connecting from Frontend

Update your frontend `.env`:

```env
VITE_API_URL=https://your-service-url.run.app
VITE_GRAPHQL_URL=https://your-service-url.run.app/graphql
```

## Troubleshooting

### Deployment fails with "API not enabled"
```bash
# Manually enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com sqladmin.googleapis.com
```

### Can't connect to database
```bash
# Check Cloud SQL instance status
gcloud sql instances describe 4hclub-db

# Check VPC connector
gcloud compute networks vpc-access connectors describe 4hclub-vpc-connector --region us-central1
```

### Cloud Run service not starting
```bash
# View detailed logs
gcloud run services logs read 4hclub-backend --region us-central1 --limit 50
```

### Need to reset database password
```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update Cloud SQL user
gcloud sql users set-password 4hclub_user \
  --instance=4hclub-db \
  --password="$NEW_PASSWORD"

# Update secret
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-password --data-file=-
```

## Cleaning Up (Deleting Everything)

To avoid charges when testing:

```bash
# Delete Cloud Run service
gcloud run services delete 4hclub-backend --region us-central1

# Delete Cloud SQL instance
gcloud sql instances delete 4hclub-db

# Delete VPC connector
gcloud compute networks vpc-access connectors delete 4hclub-vpc-connector --region us-central1

# Delete secrets
gcloud secrets delete db-password
gcloud secrets delete jwt-access-secret
gcloud secrets delete jwt-refresh-secret
```

## Next Steps

1. ✅ Set up custom domain
2. ✅ Configure frontend to use production API
3. ✅ Set up monitoring and alerts
4. ✅ Enable Cloud Build triggers for automatic deployments
5. ✅ Set up staging environment

## Support

For issues:
1. Check logs: `gcloud run services logs read 4hclub-backend --region us-central1`
2. Verify all APIs are enabled
3. Ensure billing is enabled
4. Check IAM permissions

## Security Best Practices

✅ **Implemented:**
- Secrets stored in Secret Manager (not in code)
- Database not publicly accessible (private IP)
- Service account with least privilege
- HTTPS enforced by Cloud Run
- Environment variables injected at runtime

🔒 **Recommended:**
- Enable Cloud Armor for DDoS protection
- Set up VPC Service Controls
- Enable audit logging
- Configure backup schedule for Cloud SQL
- Set up monitoring alerts

---

**Deployment created with ❤️ for 4H Club**
