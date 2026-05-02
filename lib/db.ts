import { neon } from "@neondatabase/serverless"

// Lazy initialise — avoids crashing at module load time when DATABASE_URL is
// not yet set (e.g. during local dev before the env var is wired up).
let _sql: ReturnType<typeof neon> | null = null

function getSql(): ReturnType<typeof neon> {
  if (_sql) return _sql
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it in Settings → Vars in the v0 dashboard (get it from your Neon project → Connection Details).",
    )
  }
  _sql = neon(process.env.DATABASE_URL)
  return _sql
}

// Export sql as a real callable function so Turbopack's module system can
// invoke it as a tagged template literal without a Proxy apply trap.
export const sql: ReturnType<typeof neon> = ((...args: Parameters<ReturnType<typeof neon>>) => {
  return (getSql() as any)(...args)
}) as ReturnType<typeof neon>

// Copy over any extra properties the neon client exposes (e.g. .transaction)
// so callers that use sql.transaction() still work.
Object.defineProperty(sql, "transaction", {
  get: () => getSql().transaction,
  enumerable: true,
})

export default sql
