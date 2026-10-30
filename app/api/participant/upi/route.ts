import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

const DEFAULT_VPA = "elitefun@slc"
const DEFAULT_RATE = 104
const MIN_USD = 5
const MAX_USD = 100000

type GatewayConfig = {
  vpa: string
  payeeName: string
  rate: number
  minUsd: number
  maxUsd: number
}

async function readGatewayConfig(): Promise<GatewayConfig> {
  const rows = await query<{ setting_key: string; setting_value: string | null }>(
    `SELECT setting_key, setting_value FROM system_settings
     WHERE setting_key IN ('topup_inr_upi_id','topup_inr_account_holder_name','topup_usdt_inr_rate')`,
  )
  const settings: Record<string, string> = {}
  for (const row of rows) settings[row.setting_key] = row.setting_value ?? ""

  const rate = Number(settings.topup_usdt_inr_rate)
  return {
    vpa: settings.topup_inr_upi_id?.trim() || DEFAULT_VPA,
    payeeName: settings.topup_inr_account_holder_name?.trim() || "EliteFund",
    rate: Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_RATE,
    minUsd: MIN_USD,
    maxUsd: MAX_USD,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const gateway = await readGatewayConfig()
    const requests = await query(
      `SELECT id, amount, transaction_id, payment_method, status, created_at, admin_notes
       FROM topup_requests
       WHERE LOWER(participant_email) = LOWER($1)
         AND payment_method IN ('upi','inr_bank')
       ORDER BY created_at DESC
       LIMIT 20`,
      [auth.email.toLowerCase().trim()],
    )

    return NextResponse.json({ success: true, gateway, requests })
  } catch (error) {
    console.error("[elitefund-upi] GET error:", error)
    return NextResponse.json({ success: false, message: "Unable to load the EliteFund UPI gateway" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const amountUsd = Number(body?.amountUsd)
    const utr = String(body?.utr ?? "").trim().toUpperCase()
    const note = String(body?.note ?? "").trim().slice(0, 180)

    if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD || amountUsd > MAX_USD) {
      return NextResponse.json(
        { success: false, message: `Enter an amount between $${MIN_USD} and $${MAX_USD.toLocaleString("en-US")}` },
        { status: 400 },
      )
    }

    if (!/^[A-Z0-9]{8,40}$/.test(utr)) {
      return NextResponse.json(
        { success: false, message: "Enter the UPI reference (UTR) shown in your payment app" },
        { status: 400 },
      )
    }

    const duplicate = await query("SELECT id FROM topup_requests WHERE UPPER(transaction_id) = $1 LIMIT 1", [utr])
    if (duplicate.length > 0) {
      return NextResponse.json({ success: false, message: "This UPI reference has already been submitted" }, { status: 409 })
    }

    const participants = await query<{ id: string; email: string }>(
      "SELECT id, email FROM participants WHERE LOWER(email) = $1 LIMIT 1",
      [auth.email.toLowerCase().trim()],
    )
    if (participants.length === 0) {
      return NextResponse.json({ success: false, message: "Participant account not found" }, { status: 404 })
    }

    const participant = participants[0]
    const payableAmount = Number(amountUsd.toFixed(2))

    await query(
      `INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status, admin_notes)
       VALUES ($1, $2, $3, $4, 'upi', 'pending', $5)`,
      [participant.id, participant.email, payableAmount, utr, note ? `Participant note: ${note}` : null],
    )

    await execute(
      `INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)`,
      [
        participant.id,
        participant.email,
        "upi_payment_submitted",
        "wallet",
        `EliteFund UPI collection of $${payableAmount.toFixed(2)} submitted (UTR ${utr})`,
      ],
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "UPI payment submitted. EliteFund will verify the reference and credit your wallet.",
      request: { amount: payableAmount, utr, status: "pending" },
    })
  } catch (error) {
    console.error("[elitefund-upi] POST error:", error)
    return NextResponse.json({ success: false, message: "Unable to submit the UPI payment" }, { status: 500 })
  }
}
