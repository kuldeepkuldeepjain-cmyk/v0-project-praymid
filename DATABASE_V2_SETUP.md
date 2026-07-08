# Dual Database Setup Guide

This project uses a **versioned database strategy** to support gradual migration from v1 (production) to v2 (new schema).

## Overview

- **v1 Database**: Current production database with all existing data (unchanged)
- **v2 Database**: New empty database with restructured schema
- **Router**: Automatically routes queries to the appropriate database

## Setup Steps

### 1. Create New Neon Project for v2

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project (or add a new branch to existing project)
3. Copy the connection string with `?sslmode=require`

### 2. Add Environment Variables

Add these to your `.env.local` or Vercel project settings:

```env
# v1 Database (Current - Production)
NEON_DATABASE_URL_UNPOOLED='postgresql://...'
NEON_POSTGRES_URL_NO_SSL='postgresql://...'
NEON_PGHOST='...'
POSTGRES_URL_NON_POOLING='postgresql://...'
POSTGRES_URL='postgresql://...'
DATABASE_URL='postgresql://...'

# v2 Database (New - Empty Schema)
NEON_DATABASE_URL_V2='postgresql://...'
NEON_DATABASE_URL_V2_UNPOOLED='postgresql://...'
NEON_POSTGRES_URL_V2_NO_SSL='postgresql://...'
NEON_PGHOST_V2='...'

# Feature Flag
USE_DB_V2='false'  # Set to 'true' to use v2 database
```

### 3. Database Routing

The system automatically routes based on `USE_DB_V2`:

```typescript
// Routes to v1 by default
const data = await query("SELECT * FROM users");

// Force specific version
const dataV1 = await query("SELECT * FROM users", [], "v1");
const dataV2 = await query("SELECT * FROM users", [], "v2");

// Check active version
const version = getActiveDBVersion(); // Returns "v1" or "v2"
```

### 4. Migration Strategy

#### Phase 1: Setup
- Create v2 database with new schema
- Deploy code with v2 infrastructure (no traffic to v2 yet)
- Keep `USE_DB_V2=false`

#### Phase 2: Testing
- Run migration scripts to populate v2 with data from v1
- Test v2 routes in staging environment
- Monitor for data integrity

#### Phase 3: Gradual Rollout
- Update specific routes to use v2
- Use feature flags to control rollout
- Monitor performance and errors

#### Phase 4: Cleanup
- Once all routes stable on v2, migrate remaining data
- Remove v1 database when fully deprecated

## Files Structure

```
lib/
├── db.ts           # (Keep for backward compatibility)
├── db-router.ts    # New: Database router for v1/v2
├── db-v2.ts        # New: v2 schema definitions (to be created)
└── migration/
    ├── schema-v2.sql   # v2 database schema
    └── migrate-data.ts # Data migration scripts
```

## API Routes

To use the new database system in API routes:

```typescript
// app/api/some-route/route.ts
import { query, execute, getActiveDBVersion } from "@/lib/db-router"

export async function GET(req: NextRequest) {
  const version = getActiveDBVersion()
  console.log("Using database:", version)

  // This automatically uses the active database
  const users = await query("SELECT * FROM users")

  // Or force specific version
  const legacyUsers = await query("SELECT * FROM users", [], "v1")
  const newUsers = await query("SELECT * FROM users", [], "v2")

  return Response.json({ users, version })
}
```

## Database Health Check

Monitor both databases:

```typescript
import { checkDatabaseHealth } from "@/lib/db-router"

// Check specific database
const v1Health = await checkDatabaseHealth("v1")
const v2Health = await checkDatabaseHealth("v2")

// Check both
const bothHealth = await checkDatabaseHealth("both")
// Returns: { v1: true, v2: false }
```

## Important Notes

- **Never** delete v1 until v2 is fully stable and all data migrated
- Keep both databases in sync during transition period
- Monitor database logs for errors during migration
- Test thoroughly in staging before enabling `USE_DB_V2=true` in production
- Consider setting up data sync jobs for critical tables

## Next Steps

1. Create v2 database connection
2. Add environment variables
3. Create v2 schema (`lib/db-v2.ts`)
4. Create migration scripts (`lib/migration/`)
5. Update routes to support both databases
6. Test and gradually rollout v2

---

For questions or issues, check `DATABASE_V2_SETUP.md` or review route handlers for patterns.
