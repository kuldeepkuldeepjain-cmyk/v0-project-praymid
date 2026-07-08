# Dual Database Setup for Praymid (v1 & v2)

This project uses a **versioned database strategy** to safely transition from v1 (original) to v2 (restructured) database.

## Overview

- **V1 Database**: Original production database with ALL existing data (unchanged)
- **V2 Database**: New empty database with restructured schema (fresh start)
- **Router**: Intelligent routing layer (`db-router.ts`) that decides which DB to use

## Architecture

```
Your App Routes
     ↓
lib/db-router.ts (decides v1 or v2)
     ↙          ↘
  lib/db.ts      lib/db-v2.ts
  (v1 queries)   (v2 queries)
     ↙          ↘
Database v1    Database v2
(production)   (new schema)
```

## Quick Start (3 Steps)

### Step 1: Create V2 Database Connection

You need a **second Neon database** alongside your existing one.

**In Vercel Project Settings:**
1. Go to Settings → Integrations
2. Add another Neon database (or use existing project)
3. Create a new database in that project (e.g., "praymid-v2")
4. Copy the connection string (looks like: `postgresql://user:password@host/dbname`)

### Step 2: Set Environment Variables

Add to `.env.local` (for local development):

```env
# V1 Database (already set - don't change)
DATABASE_URL=postgresql://...existing...
POSTGRES_URL=postgresql://...existing...

# V2 Database (add this)
DATABASE_URL_V2=postgresql://...new-v2-url...

# Control which database to use (start with false)
USE_DB_V2=false
```

Or in **Vercel Project Settings → Vars**, add:
- `DATABASE_URL_V2` = your new v2 connection string
- `USE_DB_V2` = `false` (or blank)

### Step 3: Initialize V2 Schema

Connect to your **V2 database** and run the migration SQL:

**Option A: Neon Console (easiest)**
1. Go to Neon Console → select your v2 project/database
2. Open SQL Editor
3. Copy-paste entire contents of `scripts/002_schema_v2_migration.sql`
4. Run it

**Option B: Command line**
```bash
psql "postgresql://..." < scripts/002_schema_v2_migration.sql
```

Done! Your v2 database now has empty tables ready for new logic.

## How to Use

### Default Behavior (Uses V1)

All existing code continues working unchanged:

```typescript
// app/api/participants/route.ts
import { getServiceClient } from "@/lib/db-router"

export async function GET() {
  const { data } = await getServiceClient()
    .from("participants")
    .select("*")
  return Response.json(data)
}
// ✓ Uses v1 database (original production data)
```

### Switch to V2 (When Ready)

Just change one environment variable:

```env
USE_DB_V2=true
```

Now the same code queries v2 tables (`participants_v2`, etc.):

```typescript
// Same code above
// ✓ Now uses v2 database (new schema)
```

### Force Specific Version

If you need to query both versions:

```typescript
import { query } from "@/lib/db-router"

// Always query v1
const v1Data = await query("SELECT * FROM participants", [], "v1")

// Always query v2
const v2Data = await query("SELECT * FROM participants_v2", [], "v2")

// Uses active version (determined by USE_DB_V2)
const data = await query("SELECT * FROM participants_v2", [])
```

## Project Files

```
lib/
├── db.ts              ← V1 database functions (keep unchanged)
├── db-v2.ts           ← V2 database functions (new)
├── db-router.ts       ← Routing layer (your control center)
└── session.ts         ← Auth (unchanged)

scripts/
├── 001_full_schema_migration.sql    ← V1 original schema
└── 002_schema_v2_migration.sql      ← V2 new schema (for v2 database)

DATABASE_V2_SETUP.md    ← This file
```

## Table Mapping (V1 → V2)

When `USE_DB_V2=true`, queries automatically use v2 tables:

| Purpose | V1 Table | V2 Table | Notes |
|---------|----------|----------|-------|
| Users | `participants` | `participants_v2` | Same structure |
| Payments | `payment_submissions` | `payment_submissions_v2` | Same structure |
| Payouts | `payout_requests` | `payout_requests_v2` | Same structure |
| Ledger | `transactions` | `transactions_v2` | Same structure |
| Predictions | `predictions` | `predictions_v2` | Same structure |
| Topups | `topup_requests` | `topup_requests_v2` | Same structure |
| Notifications | `notifications` | `notifications_v2` | Same structure |
| Activity | `activity_logs` | `activity_logs_v2` | Same structure |
| Audit | `audit_logs` | `audit_logs_v2` | Same structure |
| Wallets | `wallet_pool` | `wallet_pool_v2` | Same structure |
| Invites | `invite_logs` | `invite_logs_v2` | Same structure |

## Migration Phases

### Phase 1: Setup (Current)
- ✅ V1 database: Live with all production data
- ✅ V2 database: Created and schema initialized
- ✅ Router: Deployed and working
- **Action**: Nothing — just verify v2 is set up

### Phase 2: Test & Develop
- New features built with v2 schema
- Test changes without touching production data (v1)
- Create data migration scripts if schema differs

### Phase 3: Cutover
- When ready: Set `USE_DB_V2=true` in Vercel
- All routes start querying v2 tables
- Old v1 data remains as backup

### Phase 4: Cleanup (Optional)
- Archive v1 database after validation
- Document changes for team

## Verification

### Check Both Databases Are Connected

```typescript
// app/api/health.ts
import { checkDatabaseHealth } from "@/lib/db-router"

export async function GET() {
  const health = await checkDatabaseHealth("both")
  const version = process.env.USE_DB_V2 === "true" ? "v2" : "v1"
  return Response.json({ 
    status: "ok", 
    activeVersion: version,
    databases: health 
  })
}
```

Visit `http://localhost:3000/api/health` and you should see:
```json
{
  "status": "ok",
  "activeVersion": "v1",
  "databases": {
    "v1": true,
    "v2": true
  }
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "V2 database URL not configured" | Set `DATABASE_URL_V2` in env vars and restart dev server |
| "Connection refused" on v2 | Verify v2 database exists and is running in Neon console |
| v2 tables not found | Run migration SQL on v2 database (`002_schema_v2_migration.sql`) |
| Queries using wrong database | Check `USE_DB_V2` environment variable is set correctly |
| Need to rollback | Set `USE_DB_V2=false` — v1 data is untouched |

## Environment Variable Reference

```env
# Set these in .env.local (local dev) or Vercel Settings (production)

# V1 Database (original - already set, don't change)
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# V2 Database (new - add this)
DATABASE_URL_V2=postgresql://...new-v2-url...
# OR (alternative names)
POSTGRES_URL_V2=postgresql://...
NEON_DATABASE_URL_V2=postgresql://...

# Feature flag (controls which database is active)
USE_DB_V2=false        # Start with false (uses v1)
USE_DB_V2=true         # Switch to true when ready (uses v2)
```

## Implementation Notes for Your Team

1. **Existing code doesn't need changes** - Router handles it
2. **V1 data is always safe** - Never touched until you explicitly migrate
3. **Easy A/B testing** - Set `USE_DB_V2=true` in one environment, `false` in another
4. **Gradual rollout** - Switch between versions anytime by updating one env var
5. **No downtime** - Can test v2 while v1 runs in production

## Next Steps

1. ✅ Set `DATABASE_URL_V2` environment variable
2. ✅ Run v2 schema migration SQL on v2 database
3. ✅ Verify health check shows both DBs connected
4. → Plan which features/routes to migrate first
5. → Test those routes with `USE_DB_V2=true` locally
6. → Deploy v2 changes to staging
7. → Gradually roll out with `USE_DB_V2=true` in production

## Questions or Issues?

Review these files for implementation details:
- **`lib/db-router.ts`** - Core routing logic
- **`lib/db.ts`** - V1 database connection functions
- **`lib/db-v2.ts`** - V2 database connection functions
- **`scripts/002_schema_v2_migration.sql`** - V2 schema definition
