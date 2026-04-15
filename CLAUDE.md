# Project: [PROJECT_NAME]

## Quick Start
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env  # Then fill in values

# Run database migrations
npx prisma migrate dev

# Start development
npm run dev            # Starts both frontend and backend
npm run dev:frontend   # Frontend only (port 3000)
npm run dev:backend    # Backend only (port 4000)

# Run tests
npm test               # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:coverage  # Coverage report
```

## Architecture Overview

### Directory Structure
```
├── packages/
│   ├── frontend/          # React SPA
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── features/      # Feature modules (co-located components/hooks/tests)
│   │   │   ├── hooks/         # Shared custom hooks
│   │   │   ├── services/      # API client, GraphQL operations
│   │   │   ├── utils/         # Pure utility functions
│   │   │   └── types/         # Shared TypeScript types
│   │   └── __tests__/         # E2E tests (Puppeteer)
│   ├── backend/           # Node.js + Apollo GraphQL
│   │   ├── src/
│   │   │   ├── resolvers/     # GraphQL resolvers
│   │   │   ├── services/      # Business logic layer
│   │   │   ├── models/        # Prisma-related data access
│   │   │   ├── middleware/    # Auth, logging, error handling
│   │   │   ├── utils/         # Server utilities
│   │   │   └── types/         # Server TypeScript types
│   │   └── __tests__/
│   └── shared/            # Shared types, constants, validation schemas
├── infrastructure/        # IaC (CDK/SST/Terraform)
│   ├── lib/               # Stack definitions
│   └── environments/      # Per-environment configs
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── .github/
│   ├── workflows/         # CI/CD pipelines
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── adr/               # Architecture Decision Records
│   └── runbooks/          # Operational runbooks
└── scripts/               # Development and deployment scripts
```

### Key Patterns
- **Feature modules:** Each feature is self-contained with its own components, hooks, tests, and GraphQL operations. Import from the feature's index.ts barrel file.
- **Service layer:** All business logic lives in services, not resolvers. Resolvers are thin — they validate input, call a service, and return the result.
- **Error boundaries:** Every major UI section has an error boundary. Backend uses a centralized error handler middleware.
- **Structured logging:** Use the shared logger (winston). Always include `correlationId`, `userId`, and `action` in log context.

## Environment Management
- `.env.example` — checked in, documents all required variables
- `.env` — local development (gitignored)
- AWS SSM Parameter Store — staging and production secrets
- Environment-specific configs in `infrastructure/environments/`

## Database Conventions
- Prisma is the ORM. Always use migrations, never push directly.
- Migration naming: `YYYYMMDD_description` (e.g., `20260319_add_user_preferences`)
- Every migration gets a corresponding rollback tested locally before merge.
- Seed data lives in `prisma/seed.ts` — keep it realistic.

## Deployment
- **Dev:** Auto-deploys on push to `develop` branch
- **Staging:** Auto-deploys on push to `main`
- **Production:** Manual approval after staging E2E tests pass
- Post-deployment: Smoke tests run automatically. If they fail, auto-rollback triggers.

## Current Status
<!-- Update this section as the project evolves -->
- [ ] Project scaffolding
- [ ] CI/CD pipeline
- [ ] Auth system
- [ ] Core features
- [ ] Monitoring & alerting

## Known Gotchas
<!-- Document pitfalls discovered during development -->
- [Add gotchas as you find them]
