# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:** Download from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Enter PostgreSQL prompt
psql postgres

# Run these commands:
CREATE DATABASE 4hclub;
CREATE USER 4hclub_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE 4hclub TO 4hclub_user;
\c 4hclub
GRANT ALL ON SCHEMA public TO 4hclub_user;

# Create test database
CREATE DATABASE 4hclub_test;
GRANT ALL PRIVILEGES ON DATABASE 4hclub_test TO 4hclub_user;
\c 4hclub_test
GRANT ALL ON SCHEMA public TO 4hclub_user;
\q
```

### 3. Configure Environment

```bash
cd packages/backend
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://4hclub_user:dev_password@localhost:5432/4hclub
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

### 4. Run Migrations & Seed

```bash
# Run migrations (creates all tables)
npm run migrate

# Seed admin user
npm run seed
```

### 5. Test Everything

```bash
# Run all 70 tests
npm test
```

✅ You should see **70 tests passing**!

### 6. Start Development

```bash
# Start backend server
npm run dev
```

Server running at:
- GraphQL: http://localhost:4000/graphql
- Health: http://localhost:4000/health

## Admin Credentials

After seeding:
- **Email**: admin@bibbercreekspurs4h.org
- **Password**: Admin123!

⚠️ **Change this password immediately!**

## Need Help?

See [DATABASE_SETUP.md](../../DATABASE_SETUP.md) for detailed instructions and troubleshooting.
