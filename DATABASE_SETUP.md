# PostgreSQL Database Setup

This guide will help you set up the local PostgreSQL database for the 4-H Club website.

## Prerequisites

- PostgreSQL 14 or higher
- Node.js 18+ (already installed)

## Installation

### macOS (using Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

### Ubuntu/Debian

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Verify installation in PowerShell: `psql --version`

## Database Creation

### 1. Access PostgreSQL

```bash
# macOS/Linux
psql postgres

# Windows (as postgres user)
psql -U postgres
```

### 2. Create Database and User

```sql
-- Create database
CREATE DATABASE 4hclub;

-- Create user (change password as needed)
CREATE USER 4hclub_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE 4hclub TO 4hclub_user;

-- Connect to the database
\c 4hclub

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO 4hclub_user;

-- Exit
\q
```

### 3. Create Test Database

```sql
-- Re-enter psql
psql postgres

-- Create test database
CREATE DATABASE 4hclub_test;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE 4hclub_test TO 4hclub_user;

-- Connect and grant schema privileges
\c 4hclub_test
GRANT ALL ON SCHEMA public TO 4hclub_user;

-- Exit
\q
```

## Environment Configuration

### 1. Create `.env` file

```bash
cd packages/backend
cp .env.example .env
```

### 2. Update `.env` with your database credentials

```env
# Database (Local PostgreSQL)
DATABASE_URL=postgresql://4hclub_user:your_secure_password@localhost:5432/4hclub

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-generated-access-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret

# Other variables...
```

### 3. Generate JWT Secrets

```bash
# Run this command twice to get two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output into your `.env` file for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## Run Migrations

```bash
# From the backend directory
npm run migrate
```

This will create all necessary tables:
- users
- events
- blog_posts
- social_posts
- announcements
- documents
- photos
- sponsors
- testimonials
- rsvps
- comments
- notifications
- migrations (tracking)

## Seed Admin User

```bash
# From the backend directory
npm run seed
```

This creates an initial admin user:
- **Email**: admin@bibbercreekspurs4h.org
- **Password**: Admin123! (change this after first login!)
- **Role**: ADMIN

## Verify Setup

### 1. Run all tests

```bash
# From the backend directory
npm test
```

You should see:
- ✅ 53 unit tests passing
- ✅ 17 integration tests passing
- **Total: 70 tests passing**

### 2. Check database connection

```bash
psql -d 4hclub -U 4hclub_user -h localhost

# In psql:
\dt          # List all tables
\q           # Exit
```

### 3. Start the development server

```bash
# From the backend directory
npm run dev
```

Server should start at http://localhost:4000

- GraphQL Playground: http://localhost:4000/graphql
- Health Check: http://localhost:4000/health

## Common Issues

### Issue: "psql: command not found"

**Solution**: PostgreSQL is not in your PATH. Add it:

```bash
# macOS (Homebrew)
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Linux
# Usually already in PATH after apt install
```

### Issue: "FATAL: password authentication failed"

**Solution**:
1. Check your password in `.env` matches what you set
2. Try resetting the password:

```bash
psql postgres
ALTER USER 4hclub_user WITH PASSWORD 'new_password';
\q
```

### Issue: "FATAL: database does not exist"

**Solution**: Create the databases following step 2 above.

### Issue: "permission denied for schema public"

**Solution**: Grant schema privileges:

```sql
psql -d 4hclub -U postgres
GRANT ALL ON SCHEMA public TO 4hclub_user;
\q
```

### Issue: Tests fail with "connection refused"

**Solution**:
1. Ensure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
2. Check `.env.test` has correct `DATABASE_URL`
3. Ensure test database exists: `psql -l | grep 4hclub_test`

## Cloud Deployment (GCP Cloud SQL)

For production deployment to Google Cloud Platform:

1. Create Cloud SQL PostgreSQL instance in GCP Console
2. Create database: `4hclub`
3. Update `.env` for production:

```env
DATABASE_URL=postgresql://user:password@/4hclub?host=/cloudsql/PROJECT:REGION:INSTANCE
```

4. Run migrations on Cloud SQL:

```bash
gcloud sql connect INSTANCE_NAME --user=postgres
# Then run CREATE DATABASE and GRANT commands
```

5. Deploy backend to Cloud Run with Cloud SQL connection

## Next Steps

Once your database is set up:

1. ✅ Run migrations: `npm run migrate`
2. ✅ Seed admin user: `npm run seed`
3. ✅ Run tests: `npm test` (should see 70 passing)
4. ✅ Start dev server: `npm run dev`
5. 🚀 Continue with frontend integration (Days 6-9)

## Support

If you encounter issues:
- Check PostgreSQL logs: `tail -f /usr/local/var/log/postgres.log` (macOS)
- Verify connection: `psql -d 4hclub -U 4hclub_user`
- Ensure all environment variables are set correctly
