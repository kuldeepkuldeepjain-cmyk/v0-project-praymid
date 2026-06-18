import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query as dbQuery, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAdminSession(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { confirm } = body

    if (confirm !== "CLEAR_ALL_LEDGER") {
      return NextResponse.json(
        { success: false, error: "Confirmation code is incorrect" },
        { status: 400 }
      )
    }

    // Clear all records from all ledger-related tables
    const tables = [
      "transactions",
      "payment_submissions",
      "payout_requests",
      "topup_requests",
      "prediction_results",
    ]

    let totalDeleted = 0

    for (const table of tables) {
      try {
        const result = await execute(`DELETE FROM ${table}`, [])
        totalDeleted++
      } catch (error) {
        console.error(`Failed to clear ${table}:`, error)
      }
    }

    // Log this action
    await execute(
      `INSERT INTO activity_logs(actor_email, action, details, target_type)
       VALUES($1, 'clear_ledger', $2, 'ledger_management')`,
      [auth.ok ? auth.email : "unknown", `Cleared all ledger records from ${totalDeleted} tables`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `All ledger records have been cleared from ${totalDeleted} tables`,
      tablesCleared: tables.slice(0, totalDeleted),
    })
  } catch (error) {
    console.error("Error clearing ledger:", error)
    return NextResponse.json(
      { success: false, error: "Failed to clear ledger records" },
      { status: 500 }
    )
  }
}
