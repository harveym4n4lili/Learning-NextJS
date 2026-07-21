# Chapter 6: Setting Up Your Database

## Overview

This chapter covers setting up a **PostgreSQL database** on Vercel, connecting it to your Next.js app, and seeding it with initial data.

---

## Architecture Overview

```
Your Next.js App
        ↓
Vercel Postgres Database (Cloud-hosted)
        ↓
Placeholder Data (Users, Invoices, Customers)
```

**Why Vercel Postgres?**
- ✅ Fully managed PostgreSQL
- ✅ Secure and scalable
- ✅ Integrated with Vercel deployments
- ✅ Free tier available
- ✅ No server management needed

---

## Step-by-Step Setup

### 1. Create a GitHub Repository

Push your Next.js project to GitHub first.

**Why?** Vercel uses GitHub to:
- Deploy your app
- Auto-redeploy when you push to `main`
- Create preview URLs for pull requests

```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create a Vercel Account

1. Go to [vercel.com/signup](https://vercel.com/signup)
2. Choose the free **"Hobby"** plan
3. Click **"Continue with GitHub"**
4. Connect your GitHub account

### 3. Deploy Your Project

In Vercel Dashboard:

1. Click **"Add New"** → **"Project"**
2. Select your GitHub repository
3. Enter project name (can be anything)
4. Click **"Deploy"**
5. Wait for deployment to complete ✅

**Auto-Deployment:**
- Every `git push` to `main` → auto-redeploys
- Every pull request → gets a preview URL

### 4. Create a PostgreSQL Database

In your Vercel Project Dashboard:

1. Go to **"Storage"** tab
2. Click **"Create Database"**
3. Select **Postgres** (or Neon/Supabase depending on your region)
4. Choose **Region** → **Washington D.C (iad1)** (recommended)
5. Select storage plan (if required)
6. Click **"Create"**

✅ Database created!

### 5. Configure Environment Variables

Your database connection info is sensitive - **never commit to git**.

**Step 1: Get Connection Secrets**

In Vercel Dashboard:
1. Go to your database
2. Find `.env.local` tab
3. Click **"Show secret"**
4. Click **"Copy Snippet"**

**Step 2: Add to Your Project**

In your local project:

1. Rename `.env.example` → `.env.local`
   ```bash
   # .env.local
   POSTGRES_URL="postgresql://user:password@..."
   ```

2. **Important:** Ensure `.env.local` is in `.gitignore`
   ```
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

3. Never commit this file! ⚠️

**Why:** This file contains database credentials that must stay secret.

---

## Seeding Your Database

Seeding = populate database with initial data.

### The Seed Script

Located at: `/app/lib/db/seed.ts` or similar

**What it does:**
1. Creates tables (users, invoices, customers, etc.)
2. Inserts data from `placeholder-data.ts`
3. Hashes passwords with `bcrypt`
4. Prints success message

### Running the Seed

**Step 1: Start dev server**
```bash
pnpm run dev
```

**Step 2: Visit seed endpoint**
```
http://localhost:3000/seed
```

**Expected Output:**
```
Database seeded successfully
```

**What happened:**
- ✅ Tables created
- ✅ Data inserted
- ✅ Passwords hashed
- ✅ Database ready to use

---

## Executing Queries

Test your database connection with queries.

### Query Route

Located at: `/app/query/route.ts` (initially commented out)

**Step 1: Uncomment and modify**

```typescript
// /app/query/route.ts
import { db } from '@/app/lib/db';

export async function GET() {
  const result = await db.query(
    `SELECT invoices.amount, customers.name
     FROM invoices
     JOIN customers ON invoices.customer_id = customers.id
     WHERE invoices.amount = 666;`
  );
  
  return Response.json(result.rows);
}
```

**Step 2: Test the query**

Visit: `http://localhost:3000/query`

**Expected Response:**
```json
[
  { amount: 666, name: "Customer Name" },
  ...
]
```

✅ Database connection works!

### Common Query Examples

**Get all invoices:**
```sql
SELECT * FROM invoices;
```

**Get invoices for a specific customer:**
```sql
SELECT * FROM invoices WHERE customer_id = 1;
```

**Join invoices with customer names:**
```sql
SELECT invoices.*, customers.name
FROM invoices
JOIN customers ON invoices.customer_id = customers.id;
```

---

## Database Schema

The seed script creates these tables:

| Table | Purpose |
|-------|---------|
| `users` | App users (for authentication) |
| `customers` | Invoice customers |
| `invoices` | Invoice records |
| `revenue` | Revenue data |

### Users Table Example
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL
);
```

---

## Environment Variables Reference

After setup, your `.env.local` contains:

```env
POSTGRES_URL="postgresql://user:password@host:port/database"
```

**Access in your code:**
```typescript
const dbUrl = process.env.POSTGRES_URL;
```

⚠️ **Security:**
- Only accessible on server side (Next.js API routes)
- Never expose in client-side code
- Never commit to git

---

## Troubleshooting

### Problem: "Secrets not showing"
**Solution:** Click "Show secret" button before copying

### Problem: "Database connection failed"
**Solution:** 
1. Check `.env.local` is in project root
2. Verify `POSTGRES_URL` is complete and correct
3. Ensure environment variables loaded with restart

### Problem: "Seed failed"
**Solution:**
- Check `/app/lib/placeholder-data.ts` exists
- Verify database is created in Vercel
- Check connection string in `.env.local`

### Problem: "bcrypt dependency issue"
**Solution:** Use `bcryptjs` instead
```bash
pnpm add bcryptjs
```

### Problem: "Need to reseed with fresh data"
**Solution:** Drop tables and re-run seed
```sql
DROP TABLE invoices;
DROP TABLE customers;
DROP TABLE users;
```

⚠️ **Warning:** This deletes all data - only safe with placeholder data!

---

## Security Checklist

✅ `.env.local` is in `.gitignore`  
✅ Never commit database credentials  
✅ Use Vercel's storage dashboard for secure secrets  
✅ Keep database URL private  
✅ Always hash passwords with `bcrypt`  
✅ Use HTTPS for all connections  

---

## Quick Reference

| Step | Command/Action |
|------|----------------|
| **Create GitHub repo** | `git init` → push to GitHub |
| **Create Vercel account** | Visit vercel.com/signup |
| **Deploy project** | Import repo in Vercel Dashboard |
| **Create database** | Vercel Dashboard → Storage → Create |
| **Add env vars** | Copy secrets from Vercel → `.env.local` |
| **Seed database** | Visit `http://localhost:3000/seed` |
| **Test connection** | Visit `http://localhost:3000/query` |

---

## Next Steps

Your database is now:
- ✅ Created and hosted on Vercel
- ✅ Connected to your Next.js app
- ✅ Seeded with test data
- ✅ Ready for queries

Next chapter: **Fetching Data** - Learn different methods to fetch data from your database and display it in your app!

---

## Useful Resources

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/postgres)
- [PostgreSQL Query Documentation](https://www.postgresql.org/docs/current/sql.html)
- [bcrypt Password Hashing](https://www.npmjs.com/package/bcrypt)
- [Environment Variables in Next.js](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
