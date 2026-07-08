# Database V2 Quick Start (5 Minutes)

**You have:** v1 database with all your production data  
**You want:** v2 database (empty, fresh schema) for new development  
**You need:** 3 things

## 1️⃣ Create V2 Database (2 min)

Go to **Neon Console** (https://console.neon.tech):
1. Create new project OR add new database to existing project
2. Copy the connection string
3. Done!

## 2️⃣ Add Environment Variable (1 min)

**Vercel Settings → Vars**, add:
```
DATABASE_URL_V2 = postgresql://...your-v2-connection-string...
```

**For local `.env.local`:**
```
DATABASE_URL_V2=postgresql://...your-v2-connection-string...
USE_DB_V2=false
```

## 3️⃣ Initialize Schema (2 min)

In Neon Console, open SQL Editor for your **v2 database**, then:

Copy-paste entire content of: `/scripts/002_schema_v2_migration.sql`

Click Execute ✓

## Done! 

Your setup is complete. Both databases are now connected:
- **v1**: Your production data (untouched)
- **v2**: Fresh empty schema (ready for new features)

---

## How It Works

**Your code** → **Router** → **Decides v1 or v2** → **Database**

No code changes needed! The router handles everything.

### Default (Production)
```env
USE_DB_V2=false
```
→ All queries use **v1** (your live data)

### Test New Features
```env
USE_DB_V2=true
```
→ All queries use **v2** (empty, fresh schema)

### Switch Back (If needed)
```env
USE_DB_V2=false
```
→ Back to **v1** (data untouched)

---

## Verify It Works

```bash
npm run dev
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

✅ You're ready to go!

---

## Next: Use It

### For Existing Code (No Changes)
```typescript
const { data } = await getServiceClient()
  .from("participants")
  .select("*")

// With USE_DB_V2=false: queries v1 participants
// With USE_DB_V2=true: queries v2 participants_v2
```

### Check Which DB You're Using
```typescript
import { getActiveDBVersion } from "@/lib/db-router"

const version = getActiveDBVersion() // "v1" or "v2"
```

### Force Specific Version
```typescript
import { query } from "@/lib/db-router"

const v1Data = await query("SELECT * FROM participants", [], "v1")
const v2Data = await query("SELECT * FROM participants_v2", [], "v2")
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "V2 database URL not configured" | Set `DATABASE_URL_V2` env var, restart dev server |
| "Connection refused" | Check v2 database exists in Neon Console |
| "Table doesn't exist" | Run migration SQL on v2 database |
| Want to go back to v1 | Set `USE_DB_V2=false` |

---

## Full Documentation

- **Setup details**: `DATABASE_V2_SETUP.md`
- **Implementation guide**: `DATABASE_V2_IMPLEMENTATION.md`
- **Router code**: `lib/db-router.ts`
- **Routing logic**: `lib/db.ts`, `lib/db-v2.ts`
- **V2 Schema**: `scripts/002_schema_v2_migration.sql`

---

## Checklist

- [ ] Created v2 database in Neon
- [ ] Set `DATABASE_URL_V2` environment variable
- [ ] Ran migration SQL on v2 database
- [ ] Tested health endpoint (`/api/health`)
- [ ] Both databases show "connected"
- [ ] Ready to start developing with v2!

That's it! You're all set. 🚀
