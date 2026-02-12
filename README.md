# Bibber Creek Spurs 4-H Club Website

A modern, scalable web application for managing the Bibber Creek Spurs 4-H club, built with React, Node.js, and PostgreSQL.

## Features

- **Public Home Page**: Mission statement, testimonials, public events, blog feed, and sponsor carousel
- **Member Portal**: Private social feed, member directory, and officers listing
- **Event Management**: Create and manage public/private events with registration and Google Calendar integration
- **Blog System**: Public and member-only blog posts with social media publishing
- **Google Drive Integration**: Access to shared club files
- **Email Notifications**: Automated notifications for events and blog posts via AWS SES
- **Facebook Publishing**: Automatic publishing of events and blogs to the club's Facebook page
- **Role-Based Access**: Member, Officer, and Admin roles with appropriate permissions

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, React Router
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis
- **Authentication**: JWT with refresh tokens, bcrypt password hashing
- **Testing**: Jest, React Testing Library, Supertest
- **Deployment**: AWS (ECS, RDS, S3, CloudFront, SES)

## Project Structure

```
bibbercreekspurs/
├── packages/
│   ├── backend/          # Node.js/Express API
│   ├── frontend/         # React application
│   └── shared/           # Shared TypeScript types
├── docker/               # Docker configurations
├── .github/workflows/    # CI/CD pipelines
└── docs/                 # Documentation
```

## Prerequisites

- Node.js 18+ and Yarn 1.22+
- PostgreSQL 14+
- Redis 6+
- AWS account (for SES, S3, deployment)
- Google Cloud account (for Calendar and Drive APIs)
- Facebook Developer account (for Graph API)

## Getting Started

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Environment Variables

Create `.env` files in both backend and frontend packages:

**Backend** (`packages/backend/.env`):
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/4hclub
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
AWS_REGION=us-east-1
AWS_S3_BUCKET=4hclub-uploads
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`packages/frontend/.env`):
```env
VITE_API_URL=http://localhost:4000/api/v1
```

### 3. Set Up Database

```bash
# Create database
createdb 4hclub

# Run migrations
yarn backend migrate

# Seed initial data (creates admin user)
yarn backend seed
```

### 4. Run Development Servers

```bash
# Run both frontend and backend concurrently
yarn dev

# Or run individually
yarn backend dev
yarn frontend dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Development

### Running Tests

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn backend test:watch
yarn frontend test:watch
```

### Linting and Formatting

```bash
# Lint all packages
yarn lint

# Format code
yarn format

# Check formatting
yarn format:check
```

### Database Migrations

```bash
# Run pending migrations
yarn backend migrate

# Create new migration (manual file creation required)
# Add file to packages/backend/migrations/
```

## API Documentation

The API follows RESTful conventions with endpoints at `/api/v1/*`.

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset

### Users
- `GET /api/v1/users` - List all members
- `GET /api/v1/users/:id` - Get user profile
- `GET /api/v1/users/officers` - List officers

### Events
- `GET /api/v1/events` - List events
- `POST /api/v1/events` - Create event (officers/admins)
- `POST /api/v1/events/:id/register` - Register for event

### Blog
- `GET /api/v1/blog` - List blog posts
- `POST /api/v1/blog` - Create blog post

See [API Documentation](./docs/api.md) for complete endpoint reference.

## Deployment

### AWS Infrastructure

The application is deployed on AWS with the following services:

- **ECS**: Container orchestration for backend
- **RDS**: PostgreSQL database with Multi-AZ
- **ElastiCache**: Redis for session storage
- **S3**: Static asset hosting and file uploads
- **CloudFront**: CDN for frontend
- **SES**: Email delivery
- **Route 53**: DNS management

### CI/CD Pipeline

GitHub Actions automatically:
1. Runs tests on all pull requests
2. Builds and deploys to staging on merge to `develop`
3. Deploys to production on merge to `main`

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with short expiry (15 min access, 7 day refresh)
- Role-based access control (RBAC)
- CSRF protection
- Input validation with Zod schemas
- Rate limiting on all endpoints
- HTTPS enforced in production

## Contributing

1. Create a feature branch from `develop`
2. Write tests for new features
3. Ensure all tests pass and code is formatted
4. Submit pull request for review

## License

Private - Bibber Creek Spurs 4-H Club

## Support

For questions or issues, contact the development team or create an issue in the repository.
