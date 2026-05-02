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

// Proxy so callers can keep using `sql\`...\`` without any changes.
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  apply(_t, _thisArg, args) {
    return (getSql() as any)(...args)
  },
  get(_t, prop) {
    return (getSql() as any)[prop]
  },
}) as ReturnType<typeof neon>

export default sql
