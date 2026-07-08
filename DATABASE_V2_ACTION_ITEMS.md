# Database V2 - Your Action Items

## What's Done (By v0)

✅ Created `lib/db-router.ts` - Intelligent database routing layer  
✅ Created `lib/db-v2.ts` - V2 database connection functions  
✅ Created `scripts/002_schema_v2_migration.sql` - V2 schema definition  
✅ Updated `app/api/health/route.ts` - Database health check  
✅ Created comprehensive documentation  
✅ Everything is code-complete and ready to use

## What You Need To Do (3 Steps, ~10 minutes)

### Step 1: Create V2 Database (3 min)

**Go to Neon Console** (https://console.neon.tech)

Option A - New Project:
- Click "Create project"
- Name it (e.g., "praymid-v2")
- Wait for creation
- Copy the connection string

Option B - New Database:
- Select your existing Neon project
- Click "Databases"
- Click "Create database"
- Name it (e.g., "v2-schema")
- Copy the connection string

Copy the string that looks like:
```
postgresql://user:password@host/dbname
```

### Step 2: Add Environment Variable (3 min)

**In Vercel** (https://vercel.com/projects)

1. Open your Praymid project
2. Click Settings → Environment Variables
3. Click "Add New"
   - Name: `DATABASE_URL_V2`
   - Value: Paste your v2 connection string from Step 1
4. Select "Preview, Production"
5. Click "Save and Deploy"

Or wait... let's test locally first:

**In Your Local `.env.local`:**
```env
# Add this line
DATABASE_URL_V2=postgresql://...your-v2-connection-string...
USE_DB_V2=false
```

Then restart: `npm run dev`

### Step 3: Initialize V2 Schema (3 min)

**In Neon Console** (for your v2 database)

1. Go to your v2 database in Neon Console
2. Click "SQL Editor"
3. Copy entire content from: `scripts/002_schema_v2_migration.sql` (in your project)
4. Paste into SQL Editor
5. Click "Execute"

Done! Your v2 database now has empty tables.

## Verification (1 min)

Make sure everything works:

```bash
# Start dev server
npm run dev

# In another terminal, test:
curl http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "ok",
  "activeVersion": "v1",
  "databases": {
    "v1": "connected",
    "v2": "connected"
  }
}
```

Both should say "connected". If one says "disconnected", check that env var.

## You're Ready!

Both databases are now connected and working:
- **V1**: Your production database (with all existing data)
- **V2**: Your new empty database (fresh schema)

The router automatically decides which one to use based on `USE_DB_V2`:
- `false` (default) = Use v1 (your live data)
- `true` = Use v2 (new schema)

## Next: Start Building

### Option 1: Test Locally

```env
# .env.local
USE_DB_V2=true
```

Restart: `npm run dev`

Now your app uses v2 database. Test your changes, then switch back:

```env
# .env.local
USE_DB_V2=false
```

### Option 2: Build with V2 in Mind

All existing code works unchanged. New features can use v2 automatically:

```typescript
// This query routes based on USE_DB_V2
const { data } = await getServiceClient()
  .from("participants")  // v1 table with USE_DB_V2=false
  .select("*")           // v2 participants_v2 with USE_DB_V2=true
```

### Option 3: Force Specific Database

If you need to query both:

```typescript
import { query } from "@/lib/db-router"

// Always v1
const v1Data = await query("SELECT * FROM participants", [], "v1")

// Always v2
const v2Data = await query("SELECT * FROM participants_v2", [], "v2")
```

## Timeline Suggestion

- **Today**: Complete the 3 steps above
- **This week**: Build new features, test with `USE_DB_V2=true`
- **Next week**: Deploy to staging, full testing
- **Following week**: Production rollout
- **After**: Monitor and clean up v1 when stable

## Help & Documentation

- **Quick start (5 min)**: `DATABASE_V2_QUICK_START.md`
- **Detailed guide (30 min)**: `DATABASE_V2_SETUP.md`
- **Full implementation**: `DATABASE_V2_IMPLEMENTATION.md`
- **Overview**: `DATABASE_V2_SUMMARY.md`
- **Code**: `lib/db-router.ts`, `lib/db-v2.ts`

## Common Questions

**Q: What if I mess up v2?**
A: Just set `USE_DB_V2=false` and go back to v1. V1 is never touched.

**Q: Can I switch databases without restarting?**
A: You need to restart the app (or redeploy to Vercel).

**Q: Does v2 automatically copy data from v1?**
A: No, v2 starts empty. You control data migration.

**Q: What if I need to rollback from v2?**
A: Set `USE_DB_V2=false` and restart. Instant rollback, zero downtime.

**Q: How do I migrate data from v1 to v2?**
A: See `DATABASE_V2_IMPLEMENTATION.md` for migration script examples.

**Q: Can I delete v1 later?**
A: Yes, after v2 is stable and all data migrated.

## Checklist

Before you start development:

- [ ] Created v2 database in Neon
- [ ] Copied connection string
- [ ] Added `DATABASE_URL_V2` environment variable (local or Vercel)
- [ ] Ran schema migration SQL on v2 database
- [ ] Tested `/api/health` endpoint
- [ ] Both v1 and v2 show "connected"
- [ ] Switched `USE_DB_V2=true` locally and verified it works
- [ ] Switched `USE_DB_V2=false` to go back to v1

When all checked: You're ready to build!

---

## Key Points to Remember

1. **Your existing code needs NO changes** - Router handles everything
2. **V1 is always safe** - Never touched unless you migrate
3. **One env var controls everything** - `USE_DB_V2`
4. **Easy to test** - Switch between v1/v2 instantly
5. **Easy to rollback** - Back to v1 in seconds if needed

---

## Questions?

1. Check the documentation files
2. Review `/api/health` endpoint output
3. Test locally with `USE_DB_V2=true` and `false`
4. Check `lib/db-router.ts` for routing logic
5. Review example code in implementation guide

---

You've got everything set up. Time to build! 🚀

Start with Step 1 above and come back here when done.
