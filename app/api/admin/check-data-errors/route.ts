import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

interface ValidationResult {
  table: string
  totalRecords: number
  errors: string[]
  warnings: string[]
}

export async function GET(request: NextRequest) {
  try {
    const db = getPool()!
    const results: ValidationResult[] = []

    // 1. Check predictions table
    const predRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status NOT IN ('pending', 'settled', 'refunded') THEN 1 END) as invalid_status,
        COUNT(CASE WHEN result NOT IN ('won', 'lost', 'refunded', NULL) THEN 1 END) as invalid_result,
        COUNT(CASE WHEN entry_price IS NULL THEN 1 END) as null_entry_price,
        COUNT(CASE WHEN amount IS NULL THEN 1 END) as null_amount,
        COUNT(CASE WHEN closed_at IS NULL AND status != 'pending' THEN 1 END) as missing_closed_at
       FROM predictions`,
      []
    )
    const predErrors = []
    const predWarnings = []
    if (predRes.rows[0].invalid_status > 0) predErrors.push(`${predRes.rows[0].invalid_status} predictions with invalid status`)
    if (predRes.rows[0].invalid_result > 0) predErrors.push(`${predRes.rows[0].invalid_result} predictions with invalid result`)
    if (predRes.rows[0].null_entry_price > 0) predErrors.push(`${predRes.rows[0].null_entry_price} predictions missing entry_price`)
    if (predRes.rows[0].null_amount > 0) predErrors.push(`${predRes.rows[0].null_amount} predictions missing amount`)
    if (predRes.rows[0].missing_closed_at > 0) predWarnings.push(`${predRes.rows[0].missing_closed_at} settled predictions missing closed_at`)

    results.push({
      table: "predictions",
      totalRecords: parseInt(predRes.rows[0].total),
      errors: predErrors,
      warnings: predWarnings
    })

    // 2. Check participants table
    const partRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email IS NULL THEN 1 END) as null_email,
        COUNT(CASE WHEN account_balance IS NULL THEN 1 END) as null_balance,
        COUNT(CASE WHEN account_balance < 0 THEN 1 END) as negative_balance
       FROM participants`,
      []
    )
    const partErrors = []
    const partWarnings = []
    if (partRes.rows[0].null_email > 0) partErrors.push(`${partRes.rows[0].null_email} participants missing email`)
    if (partRes.rows[0].null_balance > 0) partErrors.push(`${partRes.rows[0].null_balance} participants missing balance`)
    if (partRes.rows[0].negative_balance > 0) partWarnings.push(`${partRes.rows[0].negative_balance} participants with negative balance`)

    results.push({
      table: "participants",
      totalRecords: parseInt(partRes.rows[0].total),
      errors: partErrors,
      warnings: partWarnings
    })

    // 3. Check payment_submissions
    const payRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status NOT IN ('pending', 'approved', 'rejected') THEN 1 END) as invalid_status,
        COUNT(CASE WHEN amount IS NULL THEN 1 END) as null_amount
       FROM payment_submissions`,
      []
    )
    const payErrors = []
    if (payRes.rows[0].invalid_status > 0) payErrors.push(`${payRes.rows[0].invalid_status} submissions with invalid status`)
    if (payRes.rows[0].null_amount > 0) payErrors.push(`${payRes.rows[0].null_amount} submissions missing amount`)

    results.push({
      table: "payment_submissions",
      totalRecords: parseInt(payRes.rows[0].total),
      errors: payErrors,
      warnings: []
    })

    // 4. Check payout_requests
    const payoutRes = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status NOT IN ('pending', 'approved', 'rejected') THEN 1 END) as invalid_status,
        COUNT(CASE WHEN amount IS NULL THEN 1 END) as null_amount
       FROM payout_requests`,
      []
    )
    const payoutErrors = []
    if (payoutRes.rows[0].invalid_status > 0) payoutErrors.push(`${payoutRes.rows[0].invalid_status} payouts with invalid status`)
    if (payoutRes.rows[0].null_amount > 0) payoutErrors.push(`${payoutRes.rows[0].null_amount} payouts missing amount`)

    results.push({
      table: "payout_requests",
      totalRecords: parseInt(payoutRes.rows[0].total),
      errors: payoutErrors,
      warnings: []
    })

    // 5. Check for pending predictions with expired timeframe
    const expiredRes = await db.query(
      `SELECT COUNT(*) as expired 
       FROM predictions 
       WHERE status = 'pending' 
       AND expiry_timestamp < NOW()`,
      []
    )
    const expiredWarnings = []
    if (expiredRes.rows[0].expired > 0) {
      expiredWarnings.push(`${expiredRes.rows[0].expired} predictions have expired but still pending`)
    }

    results.push({
      table: "expired_predictions",
      totalRecords: parseInt(expiredRes.rows[0].expired),
      errors: [],
      warnings: expiredWarnings
    })

    // Summary
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalErrors,
        totalWarnings,
        allTablesHealthy: totalErrors === 0
      },
      details: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[v0] Error in validation check:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
