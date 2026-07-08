import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import pg from "pg"

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use NON_POOLING direct connection — avoids tenant/user pooler issues
const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL

if (!connectionString) {
  console.error("No POSTGRES_URL_NON_POOLING or POSTGRES_URL env var found")
  process.exit(1)
}

// Strip sslmode from URL and force rejectUnauthorized: false
const cleanUrl = connectionString.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "")

const client = new Client({
  connectionString: cleanUrl,
  ssl: { rejectUnauthorized: false },
})

const sqlPath = join(__dirname, "001_full_schema_migration.sql")
const sql = readFileSync(sqlPath, "utf8")

async function run() {
  try {
    console.log("[migration] Connecting to database...")
    await client.connect()
    console.log("[migration] Connected. Running migration...")
    await client.query(sql)
    console.log("[migration] Schema migration completed successfully!")
    
    // Add bonus columns
    console.log("[migration] Adding bonus columns...")
    
    await client.query(`
      ALTER TABLE participants
      ADD COLUMN IF NOT EXISTS unclaimed_bonus NUMERIC DEFAULT 0
    `)
    console.log("[migration] ✅ unclaimed_bonus column added")
    
    await client.query(`
      ALTER TABLE participants
      ADD COLUMN IF NOT EXISTS bonus_claimed BOOLEAN DEFAULT FALSE
    `)
    console.log("[migration] ✅ bonus_claimed column added")
    
    await client.query(`
      ALTER TABLE participants
      ADD COLUMN IF NOT EXISTS bonus_claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
    `)
    console.log("[migration] ✅ bonus_claimed_at column added")
    
    // Create performance indexes
    console.log("[migration] Creating performance indexes...")
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_unclaimed_bonus 
      ON participants(unclaimed_bonus) WHERE unclaimed_bonus > 0
    `)
    console.log("[migration] ✅ Index idx_participants_unclaimed_bonus created")
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_bonus_claimed 
      ON participants(bonus_claimed)
    `)
    console.log("[migration] ✅ Index idx_participants_bonus_claimed created")
    
    // Verify columns
    console.log("[migration] Verifying columns...")
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'participants' 
      AND column_name IN ('unclaimed_bonus', 'bonus_claimed', 'bonus_claimed_at')
      ORDER BY ordinal_position
    `)
    
    console.log("[migration] ✅ Verified columns:")
    result.rows.forEach(row => {
      console.log(`     - ${row.column_name}: ${row.data_type}`)
    })
    
    console.log("[migration] ✅ All migrations completed successfully!")
  } catch (err) {
    console.error("[migration] Error:", err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
