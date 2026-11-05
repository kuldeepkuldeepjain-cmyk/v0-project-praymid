import { NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

const allowedNetworks = new Set(["TRC20", "BEP20", "ERC20"])

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const event = body?.event
    if (event !== "add_funds_opened" && event !== "funding_qr_created") {
      return NextResponse.json({ error: "Unsupported participant activity event" }, { status: 400 })
    }

    let details = "Opened the Add Funds flow."
    if (event === "funding_qr_created") {
      const paymentMethod = body?.paymentMethod === "inr" ? "UPI" : body?.paymentMethod === "crypto" ? "crypto" : null
      if (!paymentMethod) return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })

      const network = typeof body?.network === "string" && allowedNetworks.has(body.network) ? body.network : null
      const amount = Number(body?.amount)
      const amountLabel = Number.isFinite(amount) && amount >= 5 && amount <= 100_000 ? ` for a $${amount.toFixed(2)} entered amount` : ""
      details = paymentMethod === "UPI"
        ? `Generated a UPI funding QR${amountLabel}.`
        : `Generated a ${network || "crypto"} funding QR${amountLabel}.`
    }

    await execute(
      "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1, $2, $3, $4, $5)",
      [auth.participantId, auth.email, event, "wallet", details],
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("[v0] Participant funding activity log failed:", error)
    return NextResponse.json({ error: "Unable to record activity" }, { status: 500 })
  }
}
