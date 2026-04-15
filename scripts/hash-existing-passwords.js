/**
 * One-time migration: hash all plain-text passwords in the participants table.
 * Safe to re-run — already-hashed passwords (starting with "$2") are skipped.
 */

const { createClient } = require("@supabase/supabase-js")
const bcrypt = require("bcryptjs")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  console.log("Fetching all participants...")

  const { data: participants, error } = await supabase
    .from("participants")
    .select("id, email, password")

  if (error) {
    console.error("Failed to fetch participants:", error.message)
    process.exit(1)
  }

  console.log(`Found ${participants.length} participants.`)

  let hashed = 0
  let skipped = 0
  let failed = 0

  for (const p of participants) {
    // Skip already-hashed passwords (bcrypt hashes start with $2)
    if (!p.password || p.password.startsWith("$2")) {
      skipped++
      continue
    }

    try {
      const hashedPwd = await bcrypt.hash(p.password, 10)
      const { error: updateError } = await supabase
        .from("participants")
        .update({ password: hashedPwd })
        .eq("id", p.id)

      if (updateError) {
        console.error(`  FAIL [${p.email}]:`, updateError.message)
        failed++
      } else {
        console.log(`  OK   [${p.email}]`)
        hashed++
      }
    } catch (err) {
      console.error(`  ERR  [${p.email}]:`, err.message)
      failed++
    }
  }

  console.log(`\nDone. Hashed: ${hashed} | Skipped (already hashed): ${skipped} | Failed: ${failed}`)
}

run()
