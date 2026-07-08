# Database V2 Documentation Index

Your Praymid project now has a complete **dual database system** (v1 original + v2 new). Here's your guide to getting started.

## Start Here

### 1. First Time? Start With This
**📖 `DATABASE_V2_ACTION_ITEMS.md`** (5-10 min read)
- What v0 already did for you
- Your 3-step setup process
- Verification checklist
- Common questions answered

### 2. Quick Overview (5 min)
**📖 `DATABASE_V2_QUICK_START.md`**
- Essential concepts in 5 minutes
- 3-step quick start
- How it works at a glance
- Troubleshooting quick reference

### 3. Detailed Setup Guide (20 min)
**📖 `DATABASE_V2_SETUP.md`**
- Complete architecture diagram
- Step-by-step setup with all details
- Environment variable reference
- Table mapping (v1 → v2)
- Migration phases explained

### 4. Complete Implementation Guide (30-45 min)
**📖 `DATABASE_V2_IMPLEMENTATION.md`**
- Comprehensive setup walkthrough
- Database initialization details
- Testing procedures
- Code examples for common scenarios
- Full troubleshooting guide
- Data migration strategies

### 5. System Overview (15 min)
**📖 `DATABASE_V2_SUMMARY.md`**
- What you have (infrastructure created)
- How it works (flow diagrams)
- Step-by-step to go live
- Key features and benefits
- Summary of everything

## Core Files Created

### Database Files
- **`lib/db-router.ts`** (333 lines)
  - Main routing layer
  - Decides v1 or v2 based on `USE_DB_V2`
  - Connection pooling
  - Query builders

- **`lib/db-v2.ts`** (241 lines)
  - V2 database connection functions
  - Query helpers (queryV2, executeV2)
  - Table query builder for v2

- **`lib/db.ts`** (original, unchanged)
  - V1 database connection
  - Kept for backward compatibility

### Schema Files
- **`scripts/001_full_schema_migration.sql`**
  - Original v1 schema (reference only)

- **`scripts/002_schema_v2_migration.sql`** (266 lines)
  - Complete v2 schema with 12 tables
  - All tables suffixed with `_v2`
  - Run this on your v2 database

### Endpoint
- **`app/api/health/route.ts`** (37 lines)
  - Health check endpoint
  - Shows database connection status
  - Shows active version
  - Useful for monitoring

## Documentation Organization

```
DATABASE_V2_INDEX.md          ← You are here (navigation guide)
├── DATABASE_V2_ACTION_ITEMS.md       (Start here! - 5-10 min)
├── DATABASE_V2_QUICK_START.md        (Quick overview - 5 min)
├── DATABASE_V2_SETUP.md              (Detailed guide - 20 min)
├── DATABASE_V2_IMPLEMENTATION.md     (Complete guide - 30-45 min)
└── DATABASE_V2_SUMMARY.md            (System overview - 15 min)

lib/
├── db-router.ts        (Main routing logic - 333 lines)
├── db-v2.ts            (V2 connection - 241 lines)
└── db.ts               (V1 connection - unchanged)

scripts/
├── 001_full_schema_migration.sql     (V1 original schema)
└── 002_schema_v2_migration.sql       (V2 new schema - 266 lines)

app/api/
└── health/route.ts     (Health check - 37 lines)
```

## Quick Reference

### What Each File Does

| File | Purpose | Read When |
|------|---------|-----------|
| `DATABASE_V2_ACTION_ITEMS.md` | Your immediate next steps | First time setup |
| `DATABASE_V2_QUICK_START.md` | 5-minute overview | Need quick refresh |
| `DATABASE_V2_SETUP.md` | Detailed concepts | Understanding how it works |
| `DATABASE_V2_IMPLEMENTATION.md` | Complete guide + examples | Building features |
| `DATABASE_V2_SUMMARY.md` | System overview | Architectural overview |
| `lib/db-router.ts` | Main routing logic | Understanding code |
| `lib/db-v2.ts` | V2 database functions | Using v2-specific code |
| `scripts/002_schema_v2_migration.sql` | V2 database schema | Setting up v2 database |

## Your Setup Path

### Step 1: Do This First
1. Read: `DATABASE_V2_ACTION_ITEMS.md` (5 min)
2. Create v2 Neon database
3. Set `DATABASE_URL_V2` environment variable
4. Run schema migration SQL
5. Test health endpoint

### Step 2: Understand It
1. Read: `DATABASE_V2_QUICK_START.md` or `DATABASE_V2_SETUP.md`
2. Understand the architecture
3. Know how to switch between v1/v2
4. Know how to rollback if needed

### Step 3: Build With It
1. Read: `DATABASE_V2_IMPLEMENTATION.md` (code examples)
2. Start building new features
3. Test with `USE_DB_V2=true` locally
4. Deploy to production when ready

### Step 4: Monitor It
1. Use `/api/health` endpoint to monitor both databases
2. Check logs for errors
3. Switch between v1/v2 as needed
4. Follow migration phases in documentation

## Key Concepts

### V1 Database
- Your original production database
- All existing data stays here
- Never touched unless you migrate
- Safe backup while building v2

### V2 Database
- Fresh, empty database
- New schema for your changes
- Where new development happens
- Can test without affecting v1

### Router (db-router.ts)
- Decides which database to use
- Based on `USE_DB_V2` environment variable
- Handles all connection pooling
- Transparent to your code

### Feature Flag (USE_DB_V2)
```env
USE_DB_V2=false  # Production: Use v1 (default)
USE_DB_V2=true   # Development: Use v2 (new)
```

## Common Tasks

### I want to...

**...set up my v2 database**
→ Read `DATABASE_V2_ACTION_ITEMS.md`

**...understand the architecture**
→ Read `DATABASE_V2_SETUP.md` or `DATABASE_V2_SUMMARY.md`

**...start building new features**
→ Read `DATABASE_V2_IMPLEMENTATION.md` (code examples)

**...switch between v1 and v2**
→ See Quick Reference section below

**...migrate data from v1 to v2**
→ See "Data Migration" in `DATABASE_V2_IMPLEMENTATION.md`

**...troubleshoot a problem**
→ See Troubleshooting in `DATABASE_V2_IMPLEMENTATION.md`

**...check database health**
→ Visit `http://localhost:3000/api/health`

**...force query specific version**
→ See Code Examples in `DATABASE_V2_IMPLEMENTATION.md`

## Quick Reference: Common Commands

```bash
# Start dev server
npm run dev

# Check both databases are working
curl http://localhost:3000/api/health

# Run type check
npm run type-check

# Run build
npm run build
```

## Environment Variables You'll Need

```env
# V1 (already set, don't change)
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# V2 (add this)
DATABASE_URL_V2=postgresql://...new-v2-url...

# Feature flag (controls which DB)
USE_DB_V2=false  # Start with false
USE_DB_V2=true   # Switch when ready
```

## Architecture at a Glance

```
Your Code → Router → Decides v1 or v2 → Query Database
             ↓
      Reads: USE_DB_V2
      ↓ false → v1 (db.ts)
      ↓ true → v2 (db-v2.ts)
```

## What's Already Done

✅ Database router created and integrated  
✅ V2 database connection layer built  
✅ V2 schema migration SQL written  
✅ Health check endpoint updated  
✅ Complete documentation written  
✅ Everything is production-ready  

## What You Need To Do

1. Create v2 Neon database (3 min)
2. Add `DATABASE_URL_V2` environment variable (3 min)
3. Run schema migration SQL on v2 database (3 min)
4. Test with `/api/health` endpoint (1 min)
5. Start building (as soon as you're ready)

## Support

Can't find what you're looking for?

1. Check the table above for which file to read
2. Use Ctrl+F to search in documentation
3. Check troubleshooting sections
4. Review code comments in `lib/db-router.ts`

## Recommended Reading Order

For your first time:
1. `DATABASE_V2_ACTION_ITEMS.md` ← Start here
2. `DATABASE_V2_QUICK_START.md` ← Then this
3. `DATABASE_V2_SETUP.md` ← Then this
4. `DATABASE_V2_IMPLEMENTATION.md` ← When building

For reference:
- `DATABASE_V2_SUMMARY.md` ← System overview anytime
- `lib/db-router.ts` ← Code reference when needed

## Need Help?

1. **Setup questions** → `DATABASE_V2_ACTION_ITEMS.md`
2. **Concept questions** → `DATABASE_V2_SETUP.md`
3. **How-to questions** → `DATABASE_V2_IMPLEMENTATION.md`
4. **Code examples** → `DATABASE_V2_IMPLEMENTATION.md` (Code Examples section)
5. **Troubleshooting** → `DATABASE_V2_IMPLEMENTATION.md` (Troubleshooting section)

---

**Ready to get started?** Open `DATABASE_V2_ACTION_ITEMS.md` now!
