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
    console.log("[migration] Migration completed successfully!")
  } catch (err) {
    console.error("[migration] Error:", err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
