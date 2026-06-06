# SckoolSuite ERP - Deployment Guide

> **For Technical Teams:** This guide covers deploying a new SckoolSuite instance for any school. All instances share the same codebase and are isolated by a unique `schoolId` (default: `"default"`).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Database Provisioning](#3-database-provisioning)
4. [Build & Deploy](#4-build--deploy)
5. [First-Run Setup](#5-first-run-setup)
6. [Platform-Specific Guides](#6-platform-specific-guides)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20.x or 22.x LTS | Required for Next.js 15 |
| npm | 10.x | Bundled with Node.js 20+ |
| PostgreSQL | 15+ | Raw SQL via `pg` driver (no ORM) |
| Git | Any | For cloning the repo |

### 1.1 Verify Prerequisites

```bash
node -v   # Should print v20.x.x or v22.x.x
npm -v    # Should print 10.x.x
psql --version  # PostgreSQL 15+
```

---

## 2. Environment Setup

### 2.1 Clone & Install

```bash
git clone <your-repo-url> sckoolsuite
cd sckoolsuite
npm ci
```

### 2.2 Create Environment File

```bash
cp env.template .env.local
```

Edit `.env.local` with your actual values (see [Section 7](#7-environment-variables-reference) for the full list).

**Minimum required for any deployment:**

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-64-char-random-secret"
NODE_ENV="production"
```

**Generate a secure `NEXTAUTH_SECRET`:**

```bash
openssl rand -base64 32
```

> **Security Rule:** Never commit `.env.local` to Git. It is already in `.gitignore`.

---

## 3. Database Provisioning

SckoolSuite uses **raw PostgreSQL** (no Prisma ORM, no migrations framework). Schema is managed via a single SQL file.

### 3.1 Create the Database

**Option A: Cloud PostgreSQL (Recommended for Production)**

Providers: [Neon](https://neon.tech), [Railway](https://railway.app), [Supabase](https://supabase.com), AWS RDS, Google Cloud SQL.

1. Create a PostgreSQL 15+ instance in your cloud provider.
2. Create a database (e.g., `sckoolsuite`).
3. Copy the connection string into `DATABASE_URL`.

**Option B: Self-Hosted PostgreSQL**

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15
createdb sckoolsuite

# Ubuntu/Debian
sudo apt update && sudo apt install postgresql-15
sudo -u postgres createdb sckoolsuite
```

### 3.2 Load the Schema

```bash
psql "YOUR_DATABASE_URL" < scripts/schema.sql
```

Example:

```bash
# Local
psql postgresql://localhost:5432/sckoolsuite < scripts/schema.sql

# Neon / Cloud (with SSL)
psql "postgresql://user:pass@host.neon.tech/db?sslmode=require" < scripts/schema.sql
```

> **One schema per instance.** Each SckoolSuite deployment needs its own database. The schema includes default roles, triggers, and indexes.

### 3.3 Verify Schema Load

```bash
psql "$DATABASE_URL" -c "\dt"
```

You should see ~40+ tables including `school`, `user`, `student`, `invoice`, `session`, `term`, etc.

---

## 4. Build & Deploy

### 4.1 Local Development Build

```bash
npm run build
```

If the build succeeds with no TypeScript errors, the app is ready.

### 4.2 Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000`. The app will redirect to `/setup` if no school record exists.

### 4.3 Production Build

```bash
NODE_ENV=production npm run build
```

For production, use a process manager like `pm2` or deploy to a platform (see [Section 6](#6-platform-specific-guides)).

---

## 5. First-Run Setup

After the first deploy, the app requires an initial setup wizard.

### 5.1 Automatic Flow

1. Open the deployed URL (e.g., `https://your-domain.com`).
2. You will be redirected to `/setup`.
3. Complete the 5-step setup wizard:
   - **Step 1 — School Details:** Enter school name, email, phone, address, motto, and website.
   - **Step 2 — Academic Session:** Create an academic session (e.g., `2025/2026`) with start and end dates. It is automatically marked as current.
   - **Step 3 — Academic Term:** Create a term (e.g., `First Term`), set start/end dates, and mark it as current.
   - **Step 4 — Admin User:** Create the first administrator account (full name, email, password). This becomes the `SCHOOL_ADMIN` login.
   - **Step 5 — Review & Activate:** Review all entered details and click **Activate School** to finalize setup and unlock all modules.
4. The wizard creates:
   - A `school` record with `id = "default"`
   - An `academic_session` record (marked as current)
   - An `academic_term` record (marked as current)
   - A `SCHOOL_ADMIN` user account
   - Default roles and settings

### 5.2 Manual Admin Creation (Optional)

If you need to seed an admin without the UI:

```bash
psql "$DATABASE_URL" << 'EOF'
-- Insert default school
INSERT INTO school (id, name, email, phone, address, is_setup, is_active)
VALUES ('default', 'Your School Name', 'admin@school.edu', '+234...', 'School Address', true, true)
ON CONFLICT (id) DO NOTHING;

-- Insert SCHOOL_ADMIN role (if not present)
INSERT INTO role (id, name, description)
VALUES (gen_random_uuid(), 'SCHOOL_ADMIN', 'School Administrator')
ON CONFLICT (name) DO NOTHING;

-- Create admin user (password must be hashed with bcrypt)
-- Use the app's auth utilities or a separate script to hash the password.
EOF
```

> **Note:** Password hashing uses bcrypt. Use the app's registration flow or a Node.js script with `bcrypt` to generate the hash.

---

## 6. Platform-Specific Guides

### 6.1 Vercel (Serverless)

**Best for:** Quick deployments, automatic scaling, low maintenance.

1. **Import Project:** Push code to GitHub/GitLab, import into Vercel.
2. **Framework Preset:** Next.js (auto-detected).
3. **Build Command:** `npm run build` (no Prisma steps needed).
4. **Environment Variables:** Add in Vercel Dashboard > Settings > Environment Variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (your Vercel domain)
   - `NEXTAUTH_SECRET`
   - `NODE_ENV` = `production`
5. **Database:** Use [Neon Serverless Postgres](https://neon.tech) or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres). Ensure the database is in a region close to your Vercel functions.
6. **Deploy:** Push to `main` branch triggers auto-deploy.

**Vercel CLI (Alternative):**

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel --prod
```

### 6.2 Self-Hosted VPS / Dedicated Server

**Best for:** Full control, compliance requirements, offline deployments.

**Requirements:**
- Ubuntu 22.04 LTS / Debian 12 / CentOS 9
- Node.js 20+ (via [NodeSource](https://github.com/nodesource/distributions) or [nvm](https://nvm.sh))
- PostgreSQL 15+
- Nginx (reverse proxy + SSL)
- PM2 (process manager)

**Setup Steps:**

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y nginx postgresql-15 git

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2
sudo npm install -g pm2

# 4. Clone & build
git clone <repo> /var/www/sckoolsuite
cd /var/www/sckoolsuite
npm ci
npm run build

# 5. Database
cd /var/www/sckoolsuite
sudo -u postgres createdb sckoolsuite
sudo -u postgres psql sckoolsuite < scripts/schema.sql

# 6. Environment
cp env.template .env.local
nano .env.local  # Edit DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET

# 7. Start with PM2
pm2 start npm --name "sckoolsuite" -- start
pm2 save
pm2 startup systemd

# 8. Nginx reverse proxy
sudo nano /etc/nginx/sites-available/sckoolsuite
```

**Nginx Config:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sckoolsuite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 6.3 Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next-build ./.next-build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

And `docker-compose.yml`:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/sckoolsuite
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=change-me-in-production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sckoolsuite
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

Run:

```bash
docker compose up --build -d
```

---

## 7. Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NEXTAUTH_URL` | Public URL of the deployed app | `https://school.example.com` |
| `NEXTAUTH_SECRET` | Encryption key for sessions | `openssl rand -base64 32` |
| `NODE_ENV` | Runtime environment | `production` or `development` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public app URL (client-side) | Same as `NEXTAUTH_URL` |
| `APP_URL` | Internal app URL | Same as `NEXTAUTH_URL` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for image uploads | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |
| `SMTP_HOST` | SMTP server for email notifications | - |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `FROM_EMAIL` | Sender email address | - |
| `REDIS_URL` | Redis for caching/sessions | - |
| `EMAIL_WEBHOOK_URL` | Webhook for email events | - |

### Database URL Formats

**Local (no SSL):**
```
postgresql://localhost:5432/sckoolsuite
```

**Neon / Supabase (SSL required):**
```
postgresql://user:pass@host.neon.tech/db?sslmode=require
```

**Railway:**
```
postgresql://user:pass@containers.railway.app:5432/railway
```

---

## 8. Troubleshooting

### Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `database "ralphmore" does not exist` | `DATABASE_URL` is empty or malformed | Check `.env.local` has a valid `DATABASE_URL` |
| `relation "school" does not exist` | Schema not loaded | Run `psql "$DATABASE_URL" < scripts/schema.sql` |
| `The server does not support SSL connections` | SSL config mismatch | For local DB, use no SSL. For cloud DB, add `?sslmode=require` |
| TypeScript `any` errors | ESLint strict mode | `@typescript-eslint/no-explicit-any` is disabled in `eslint.config.mjs` |
| `Cannot find module '@radix-ui/react-label'` | Missing dependency | Run `npm install @radix-ui/react-label` |

### Runtime Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `AggregateError` / connection refused | Database is down or URL is wrong | Verify PostgreSQL is running and `DATABASE_URL` is correct |
| `error: database does not exist` | Database name in URL is wrong | Create the database first (`createdb dbname`) |
| Setup wizard loops / redirects | No school record + no admin user | Ensure schema is loaded and visit `/setup` |

### Database Connection Test

```bash
# Via API (once app is running)
curl https://your-domain.com/api/test-db

# Via psql
psql "$DATABASE_URL" -c "SELECT current_database(), NOW();"
```

### Re-Deploying / Resetting an Instance

If you need to reset an instance (wipe all data but keep the schema and default roles):

```bash
# Option 1: Use the cleanup script (preserves schema, resets all data)
node scripts/run-cleanup.js

# Option 2: Manual cleanup via psql
psql "$DATABASE_URL" < scripts/cleanup.sql
```

Then visit `/setup` to re-run the wizard.

> **Note:** The `scripts/run-cleanup.js` helper reads `DATABASE_URL` from `.env.local` and executes `scripts/cleanup.sql` for you. Use this when you don't have `psql` configured locally.

---

## Quick-Start Checklist for New Instances

Use this checklist for every new school deployment:

- [ ] Provision a new PostgreSQL database
- [ ] Run `scripts/schema.sql` against the new database
- [ ] Create `.env.local` with unique `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`
- [ ] Run `npm ci && npm run build`
- [ ] Deploy to your platform (Vercel / VPS / Docker)
- [ ] Visit the deployed URL and complete `/setup` wizard
- [ ] Create the first `SCHOOL_ADMIN` user via the setup wizard
- [ ] Verify login works
- [ ] (Optional) Configure Cloudinary for image uploads
- [ ] (Optional) Configure SMTP for email notifications

---

*Last updated: 2026-06-06 | SckoolSuite ERP v0.1.0*
