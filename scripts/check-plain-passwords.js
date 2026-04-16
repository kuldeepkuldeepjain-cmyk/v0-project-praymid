// Check which participants have plain_password set vs not
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from("participants")
  .select("email, plain_password")
  .order("created_at", { ascending: false })

if (error) {
  console.error("Error:", error.message)
  process.exit(1)
}

let withPassword = 0
let withoutPassword = 0
for (const p of data) {
  if (p.plain_password) {
    withPassword++
    console.log(`[OK]    ${p.email} — has plain_password`)
  } else {
    withoutPassword++
    console.log(`[EMPTY] ${p.email} — no plain_password (will populate on next login)`)
  }
}

console.log(`\nSummary: ${withPassword} have plain_password, ${withoutPassword} need to log in once to populate it.`)
