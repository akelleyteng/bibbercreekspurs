# GitHub Actions Setup Guide

This guide explains how to configure GitHub Actions for automatic deployment.

## Overview

Two workflows are configured:
1. **Frontend Deployment** → GitHub Pages (bibbercreekspurs4h.org)
2. **Backend Deployment** → Google Cloud Run

Both workflows trigger automatically when code is pushed to the `main` branch.

## Required GitHub Secrets

You need to add one secret to your GitHub repository:

### 1. GCP_SA_KEY (Google Cloud Service Account Key)

This secret allows GitHub Actions to authenticate with Google Cloud Platform.

**How to create it:**

```bash
# 1. Create a service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment" \
  --project=bibbercreekspurs-4h

# 2. Grant necessary permissions
gcloud projects add-iam-policy-binding bibbercreekspurs-4h \
  --member="serviceAccount:github-actions@bibbercreekspurs-4h.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding bibbercreekspurs-4h \
  --member="serviceAccount:github-actions@bibbercreekspurs-4h.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding bibbercreekspurs-4h \
  --member="serviceAccount:github-actions@bibbercreekspurs-4h.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding bibbercreekspurs-4h \
  --member="serviceAccount:github-actions@bibbercreekspurs-4h.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# 3. Create and download the key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@bibbercreekspurs-4h.iam.gserviceaccount.com

# 4. Copy the entire contents of github-actions-key.json
cat github-actions-key.json
```

**Add to GitHub:**

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GCP_SA_KEY`
5. Value: Paste the entire contents of `github-actions-key.json`
6. Click **Add secret**

**⚠️ Security:** Delete the `github-actions-key.json` file after adding it to GitHub:
```bash
rm github-actions-key.json
```

## Workflow Triggers

### Frontend Deployment
Triggers when changes are pushed to `main` in:
- `packages/frontend/**`
- `packages/shared/**`
- `.github/workflows/deploy-frontend.yml`

### Backend Deployment
Triggers when changes are pushed to `main` in:
- `packages/backend/**`
- `packages/shared/**`
- `cloudbuild.yaml`
- `.github/workflows/deploy-backend.yml`

## Manual Deployment

You can also trigger deployments manually:

1. Go to **Actions** tab in GitHub
2. Select the workflow (Frontend or Backend)
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow**

## Monitoring Deployments

1. Go to the **Actions** tab in your GitHub repository
2. Click on a workflow run to see detailed logs
3. Each step will show success ✅ or failure ❌

## Testing the Setup

After adding the secrets:

1. Make a small change to the frontend (e.g., update a comment)
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Test GitHub Actions deployment"
   git push origin main
   ```
3. Go to GitHub Actions tab and watch the deployment

## Troubleshooting

### Frontend deployment fails
- Check that `VITE_GRAPHQL_URL` is set correctly in the workflow
- Verify GitHub Pages is enabled in repository settings

### Backend deployment fails
- Verify `GCP_SA_KEY` secret is set correctly
- Check that the service account has the required permissions
- Review Cloud Run logs for deployment errors

### Both fail with "permission denied"
- Check that the GitHub Actions service account has the correct IAM roles
- Verify secrets are added to the repository (not organization)

## Local Development

For local development, continue using:

```bash
# Frontend
cd packages/frontend
npm run build
npm run deploy

# Backend
./deploy-backend-updated.sh
```

GitHub Actions will handle deployments for the `main` branch automatically.
