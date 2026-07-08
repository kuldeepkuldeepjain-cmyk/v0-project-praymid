# Database V2 Implementation Guide

Complete step-by-step instructions for setting up and using the dual database system.

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Initialization](#database-initialization)
4. [Testing the Setup](#testing-the-setup)
5. [Migration Strategy](#migration-strategy)
6. [Code Examples](#code-examples)
7. [Troubleshooting](#troubleshooting)

## Initial Setup

### Prerequisites
- Existing Neon database (v1) running with your current app
- Access to Vercel project settings
- Node.js and npm installed locally

### Step 1: Create Second Neon Database

**Via Neon Console:**
1. Go to https://console.neon.tech
2. Choose option:
   - **Option A**: Create new project → Click "Create project" → Name it (e.g., "praymid-v2")
   - **Option B**: Use existing project → Create new branch (e.g., "v2-schema")
3. Navigate to the new database
4. Copy the connection string
5. The connection string should look like:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```

**Via Vercel Integration:**
1. Go to Vercel project → Settings → Integrations
2. Add Neon database
3. Follow prompts to create or select a database
4. Copy the connection string provided

### Step 2: Update Vercel Environment Variables

Go to **Vercel Project Settings → Vars** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL_V2` | `postgresql://...` | Your new v2 database connection string |
| `USE_DB_V2` | `false` | Keep as false initially |

**For Local Development:**

Create/update `.env.local`:
```env
# Existing v1 (don't change)
DATABASE_URL=postgresql://...existing...
POSTGRES_URL=postgresql://...existing...

# Add v2 database
DATABASE_URL_V2=postgresql://...new-v2...

# Control which database to use
USE_DB_V2=false
```

### Step 3: Initialize V2 Schema

Run the schema migration on your **v2 database only**:

**Option A: Using Neon Console (Easiest)**
1. Go to Neon Console
2. Select your v2 database/project
3. Click "SQL Editor"
4. Copy entire content of `scripts/002_schema_v2_migration.sql` from your project
5. Paste into SQL Editor
6. Click "Execute"

**Option B: Using psql Command**
```bash
# From project root
psql "postgresql://user:password@host/v2dbname?sslmode=require" < scripts/002_schema_v2_migration.sql
```

**Option C: Using Neon CLI**
```bash
# If you have neon CLI installed
neon sql -c "postgresql://..." < scripts/002_schema_v2_migration.sql
```

## Environment Configuration

### All Available Environment Variables

```env
# ============================================
# V1 DATABASE (Original - Production)
# ============================================
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# ============================================
# V2 DATABASE (New - Empty Schema)
# ============================================
DATABASE_URL_V2=postgresql://...new-v2...
POSTGRES_URL_V2=postgresql://...
NEON_DATABASE_URL_V2=postgresql://...

# ============================================
# FEATURE FLAG (Controls Active DB)
# ============================================
# false = Use v1 (production) ← START HERE
# true = Use v2 (new schema)
USE_DB_V2=false
```

### Where to Set Variables

**Local Development:**
- File: `.env.local`
- Restart: `npm run dev`

**Staging/Production:**
- Go to Vercel Project → Settings → Vars
- Add variables
- Redeploy or wait for auto-redeploy

## Database Initialization

### Verify Both Databases Exist

After setup, verify connectivity:

```bash
# Test v1 database
psql "postgresql://..." -c "SELECT 1"

# Test v2 database
psql "postgresql://..." -c "SELECT 1"
```

### Check Schema Was Created

Connect to v2 and verify tables exist:

```bash
psql "postgresql://..." << EOF
\dt            -- List all tables
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
EOF
```

You should see tables like: `participants_v2`, `payment_submissions_v2`, etc.

## Testing the Setup

### 1. Local Testing

```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# In another terminal, test health check:
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeVersion": "v1",
  "databases": {
    "v1": "connected",
    "v2": "connected"
  },
  "environment": {
    "USE_DB_V2": "false",
    "HAS_DATABASE_URL_V2": "yes"
  }
}
```

### 2. Test Database Switching

In your `.env.local`, change:
```env
USE_DB_V2=true
```

Restart dev server (`npm run dev`), then test again:
```bash
curl http://localhost:3000/api/health
```

You should now see:
```json
{
  "activeVersion": "v2",
  "databases": {
    "v1": "connected",
    "v2": "connected"
  }
}
```

Then switch back:
```env
USE_DB_V2=false
```

## Migration Strategy

### Recommended Timeline

**Week 1: Setup & Testing**
- Create v2 database ✅
- Initialize schema ✅
- Verify both DBs working ✅
- Plan which features to migrate first

**Week 2-3: Develop & Test**
- Build new features with v2 schema
- Test thoroughly in local/staging
- Create data migration scripts if needed

**Week 4: Staging Validation**
- Deploy code to staging
- Set `USE_DB_V2=true` in staging
- Run full regression testing

**Week 5: Production Rollout**
- Set `USE_DB_V2=true` in production
- Monitor logs for errors
- Keep v1 as backup

**Week 6+: Cleanup**
- Archive v1 database after stability
- Document breaking changes for team

### Data Migration (If Needed)

If your v2 schema is different and requires data migration:

**Create migration script: `scripts/migrate-v1-to-v2.ts`**

```typescript
import { query as queryV1, execute: executeV2 } from "@/lib/db-router"

export async function migrateAllData() {
  console.log("Starting v1 → v2 migration...")

  try {
    // Example: Migrate participants
    const participants = await queryV1("SELECT * FROM participants", [], "v1")
    
    for (const p of participants) {
      await executeV2(
        `INSERT INTO participants_v2 (id, full_name, email, ...) 
         VALUES ($1, $2, $3, ...)`,
        [p.id, p.full_name, p.email, ...],
        "v2"
      )
    }

    console.log(`Migrated ${participants.length} participants`)
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}
```

## Code Examples

### Example 1: Basic Query (Uses Active DB)

```typescript
// app/api/participants/route.ts
import { getServiceClient } from "@/lib/db-router"

export async function GET() {
  const { data: participants } = await getServiceClient()
    .from("participants")
    .select("*")
    .limit(10)

  return Response.json(participants)
}

// With USE_DB_V2=false: Queries v1 participants table
// With USE_DB_V2=true: Queries v2 participants_v2 table
// No code changes needed!
```

### Example 2: Force Specific Version

```typescript
import { query } from "@/lib/db-router"

export async function GET() {
  // Always v1
  const v1Data = await query(
    "SELECT * FROM participants WHERE status = $1",
    ["active"],
    "v1"
  )

  // Always v2
  const v2Data = await query(
    "SELECT * FROM participants_v2 WHERE status = $1",
    ["active"],
    "v2"
  )

  return Response.json({ v1: v1Data, v2: v2Data })
}
```

### Example 3: Check Active Version

```typescript
import { getActiveDBVersion } from "@/lib/db-router"

export async function GET() {
  const version = getActiveDBVersion()
  
  if (version === "v1") {
    console.log("Using production database")
  } else {
    console.log("Using experimental v2 database")
  }

  return Response.json({ activeVersion: version })
}
```

### Example 4: Gradual Feature Rollout

```typescript
import { getActiveDBVersion } from "@/lib/db-router"
import { getServiceClient } from "@/lib/db-router"

export async function POST(req: Request) {
  const body = await req.json()
  const db = getServiceClient()

  // New features only available on v2
  if (getActiveDBVersion() === "v2" && body.useNewFeature) {
    // Use new v2 features
    const { data } = await db
      .from("participants_v2")
      .select("id, new_field") // New field from v2 schema
      .single()
    return Response.json(data)
  }

  // Fallback for v1
  const { data } = await db
    .from("participants")
    .select("id, email")
    .single()
  return Response.json(data)
}
```

## Troubleshooting

### Problem: "V2 database URL not configured"

**Cause:** `DATABASE_URL_V2` environment variable not set

**Solution:**
1. Add `DATABASE_URL_V2=postgresql://...` to Vercel Settings → Vars
2. Or add to `.env.local` for local development
3. Restart dev server: `npm run dev`

### Problem: "Connection refused" on v2

**Cause:** v2 database doesn't exist or isn't running

**Solution:**
1. Go to Neon Console
2. Verify v2 database exists
3. Check connection string is correct
4. Verify network access is allowed

### Problem: "relation 'participants_v2' does not exist"

**Cause:** v2 schema not initialized

**Solution:**
1. Connect to v2 database in Neon Console
2. Open SQL Editor
3. Copy-paste `scripts/002_schema_v2_migration.sql`
4. Execute the SQL

### Problem: Switching between v1/v2 loses data

**Expected behavior:** No data should be lost
- v1 database keeps all original data
- v2 database is fresh/empty
- Switching `USE_DB_V2` just changes which DB queries go to

**Verify:**
- Check you're querying the correct table names
- v2 uses `_v2` suffix: `participants_v2`, `payment_submissions_v2`, etc.
- v1 uses original names: `participants`, `payment_submissions`, etc.

### Problem: Need to Rollback

**To go back to v1 production:**
1. Set `USE_DB_V2=false` in Vercel Settings
2. Restart/redeploy
3. All queries go back to v1 tables
4. v1 data is completely untouched

## Common Scenarios

### Scenario 1: Testing new code before deployment

```bash
# Local: Set in .env.local
USE_DB_V2=true

# Test new features with v2 schema
npm run dev

# Verify everything works

# Switch back to v1
USE_DB_V2=false
npm run dev

# Commit and push
```

### Scenario 2: A/B testing in production

```env
# Staging environment
USE_DB_V2=true   # Test v2 with real users

# Production environment
USE_DB_V2=false  # Keep using v1 (stable)
```

### Scenario 3: Gradual rollout

```env
# Week 1-2: Test in staging/dev
# Staging: USE_DB_V2=true
# Production: USE_DB_V2=false

# Week 3: Enable for 10% of users (using feature flags)
# Week 4: Enable for 50% of users
# Week 5: Enable for 100% of users (set USE_DB_V2=true globally)
```

## Next Steps

1. ✅ Create v2 Neon database
2. ✅ Add `DATABASE_URL_V2` environment variable
3. ✅ Run v2 schema migration SQL
4. ✅ Test health check endpoint
5. → Plan which features use v2 first
6. → Start building with v2 schema
7. → Test thoroughly before flipping `USE_DB_V2=true`

## Support

For issues or questions:
1. Check `DATABASE_V2_SETUP.md` for overview
2. Review `lib/db-router.ts` for routing logic
3. Check `scripts/002_schema_v2_migration.sql` for schema
4. Test health endpoint: `/api/health`
