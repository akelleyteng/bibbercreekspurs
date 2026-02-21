# Bibber Creek Spurs 4-H Club Website

A full-stack web application for the Bibber Creek Spurs 4-H Club, built as a monorepo with React frontend and Node.js/GraphQL backend.

## Architecture

```
packages/
  frontend/   - React + Vite (hosted on GitHub Pages)
  backend/    - Express + Apollo GraphQL (hosted on Google Cloud Run)
  shared/     - Shared TypeScript types and enums
```

- **Frontend**: React 18, Vite, TailwindCSS, Apollo Client — deployed to GitHub Pages at bibbercreekspurs4h.org
- **Backend**: Express, Apollo Server, TypeGraphQL, PostgreSQL (Cloud SQL) — deployed to Google Cloud Run
- **Shared**: Common TypeScript types, enums, and interfaces consumed by both frontend and backend

## Features

- **Member Management** — Registration, admin approval workflow, profiles with contact info and emergency details
- **Family Linking** — Parent-youth account connections with admin and self-service management
- **Events** — Google Calendar integration as source of truth for club events
- **Document Library** — Google Drive-backed file uploads organized into member and leadership folders
- **Social Feed** — Rich text posts (Tiptap editor) with image/video media attachments, comments, and reactions
- **Member Directory** — Searchable directory of approved club members
- **Role-based Access** — Admin, leader, and member roles with scoped permissions

## Prerequisites

- Node.js >= 18
- Yarn >= 1.22
- PostgreSQL 14+ (local dev)

## Getting Started

```bash
# Install dependencies
yarn install

# Build shared package
yarn shared build

# Start both frontend and backend in dev mode
yarn dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:4000`.

## Media Uploads (Social Feed)

Social feed posts support image and video attachments stored in Google Cloud Storage (GCS).

- **Images**: JPEG, PNG, GIF, WebP — up to 10 MB each
- **Videos**: MP4, MOV, WebM — up to 50 MB each
- **Limit**: 4 media items per post

Files are uploaded via `POST /api/upload/media` (multipart/form-data with Bearer token auth) and stored in GCS at `social-feed/YYYY/MM/<uuid>.<ext>` with public read access. The upload returns a media ID that gets linked to the post during creation via the `createPost` GraphQL mutation.

## Infrastructure & Deployment

All GCP infrastructure is provisioned via **`packages/backend/scripts/deploy-gcp.sh`**. This script is the **source of truth** for infrastructure setup and should always be updated when deployment configuration changes. It handles:

- Cloud SQL instance and database creation
- Secret Manager secrets (JWT, database URL, OAuth credentials, SMTP)
- Service account creation and IAM role bindings
- GCS bucket for media uploads (with public read access)
- Cloud Build container image build
- Cloud Run service deployment

**Automated deployments** are handled by GitHub Actions:

| Workflow | Trigger | Target |
|----------|---------|--------|
| `deploy-backend.yml` | Push to `main` (backend/shared/cloudbuild changes) | Cloud Run via Cloud Build |
| `deploy-frontend.yml` | Push to `main` (frontend changes) | GitHub Pages |

### First-time GCP Setup

```bash
export GCP_PROJECT_ID=your-project-id
cd packages/backend
bash scripts/deploy-gcp.sh
bash scripts/run-migrations-gcp.sh
bash scripts/seed-db-gcp.sh
```

## Database Migrations

Migrations live in `packages/backend/migrations/` and are numbered sequentially (e.g., `001_initial.sql`, `024_post_media.sql`). Run them against Cloud SQL with:

```bash
cd packages/backend
bash scripts/run-migrations-gcp.sh
```

## Development

### Running Tests

```bash
yarn test
yarn test:coverage
```

### Linting and Formatting

```bash
yarn lint
yarn format
yarn format:check
```

## Environment Variables

The backend expects these environment variables (managed via GCP Secret Manager in production):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `FRONTEND_URL` | Frontend origin for CORS |
| `GCP_STORAGE_BUCKET` | GCS bucket name for media uploads |
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth2 client ID (Drive, Calendar) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth2 client secret |
| `GOOGLE_DRIVE_OWNER_REFRESH_TOKEN` | OAuth2 refresh token for Drive uploads |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID for events |
| `GOOGLE_DRIVE_MEMBERS_FOLDER_ID` | Drive folder for member-accessible documents |
| `GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID` | Drive folder for leadership-only documents |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email configuration |

## Security

- Passwords hashed with bcrypt
- JWT tokens with short expiry (15 min access, 7 day / 30 day refresh with Remember Me)
- Role-based access control (Admin, Leader, Member)
- Server-side HTML sanitization on social feed posts
- Input validation via class-validator
- CORS restricted to frontend origin

## License

Private - Bibber Creek Spurs 4-H Club
