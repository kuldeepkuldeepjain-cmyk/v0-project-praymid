import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it in Settings → Vars.")
}

// Direct neon export — Turbopack-compatible, no Proxy or wrapper.
export const sql = neon(process.env.DATABASE_URL)

export default sql
