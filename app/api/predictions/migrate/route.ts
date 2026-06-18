import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

// Adds target_price and closed_at columns to predictions if they don't exist.
// Safe to run multiple times.
export async function POST() {
  try {
    const db = getPool()!

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'predictions' AND column_name = 'target_price'
        ) THEN
          ALTER TABLE predictions ADD COLUMN target_price NUMERIC;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'predictions' AND column_name = 'closed_at'
        ) THEN
          ALTER TABLE predictions ADD COLUMN closed_at TIMESTAMPTZ;
        END IF;
      END
      $$;
    `)

    return NextResponse.json({ success: true, message: "Predictions table migrated — target_price and closed_at columns ensured." })
  } catch (error: any) {
    console.error("[v0] predictions migrate error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
