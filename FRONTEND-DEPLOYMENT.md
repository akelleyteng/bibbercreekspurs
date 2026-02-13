# Frontend Deployment Guide - GitHub Pages

## Overview
The frontend is automatically deployed to GitHub Pages using GitHub Actions. Every push to the `main` branch triggers a new deployment.

## Live Site
- **Production URL**: https://www.bibbercreekspurs4h.org
- **GitHub Pages URL**: https://akelleyteng.github.io/bibbercreekspurs

## Setup Instructions

### 1. Enable GitHub Pages (One-time Setup)

1. Go to your GitHub repository: https://github.com/akelleyteng/bibbercreekspurs
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select: **GitHub Actions**
4. Click **Save**

### 2. Configure Custom Domain (One-time Setup)

#### Update DNS Settings
You need to update your domain's DNS settings to point to GitHub Pages:

1. Log into your domain registrar (where you bought bibbercreekspurs4h.org)
2. Find DNS settings/DNS management
3. **Delete or disable** the current Wix DNS records
4. Add these new DNS records:

```
Type    Name    Value                       TTL
A       @       185.199.108.153            3600
A       @       185.199.109.153            3600
A       @       185.199.110.153            3600
A       @       185.199.111.153            3600
CNAME   www     akelleyteng.github.io      3600
```

**Important**: DNS changes can take 24-48 hours to fully propagate.

#### Verify Domain in GitHub

1. Go to **Settings** → **Pages** in your GitHub repo
2. Under **Custom domain**, enter: `www.bibbercreekspurs4h.org`
3. Click **Save**
4. Wait for DNS check to complete (green checkmark)
5. Enable **Enforce HTTPS** (after DNS verification completes)

### 3. Deploy the Frontend

The frontend deploys automatically when you push to `main`. To trigger a manual deployment:

```bash
# Commit the deployment configuration
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main

# Or trigger manually from GitHub
# Go to Actions tab → Deploy Frontend → Run workflow
```

### 4. Verify Deployment

After pushing, check deployment status:
1. Go to **Actions** tab in GitHub
2. Watch the "Deploy Frontend to GitHub Pages" workflow
3. When complete (green checkmark), your site is live!

## Local Development

To run the frontend locally with the production backend:

```bash
cd packages/frontend

# Create local .env
cat > .env << 'EOF'
VITE_GRAPHQL_URL=https://hclub-backend-grkqj74whq-uc.a.run.app/graphql
EOF

# Start dev server
npm run dev
```

Open http://localhost:3000

## Architecture

```
User Browser
    ↓
GitHub Pages (Frontend - React)
    ↓ (GraphQL)
Cloud Run (Backend - Node.js)
    ↓
Cloud SQL (Database - PostgreSQL)
```

## Cost
- **GitHub Pages**: $0/month (100% free)
- **Custom Domain**: Already owned
- **Total Frontend Cost**: $0/month 🎉

## Troubleshooting

### DNS Not Working
- Wait 24-48 hours for DNS propagation
- Use `dig www.bibbercreekspurs4h.org` to check DNS records
- Verify A records point to GitHub's IP addresses

### HTTPS Certificate Error
- Ensure DNS is fully propagated first
- Wait a few hours after DNS verification
- GitHub automatically provisions SSL certificate

### Build Failing
- Check GitHub Actions logs in the Actions tab
- Verify all dependencies are in package.json
- Ensure VITE_GRAPHQL_URL is correct

## Monitoring

- **GitHub Actions**: Monitor deployments at https://github.com/akelleyteng/bibbercreekspurs/actions
- **Uptime**: GitHub Pages has 99.9%+ uptime
- **Analytics**: Consider adding Google Analytics to track visitors

## Future Enhancements

- Add Google Analytics for visitor tracking
- Set up Sentry for error monitoring
- Add deployment notifications (Slack/Email)
- Implement preview deployments for PRs
