import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { uploadBase64ToR2 } from "@/lib/cloudflare-r2"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const requests = await query(
      `SELECT id, amount, transaction_id, payment_method, status, created_at
       FROM topup_requests
       WHERE LOWER(participant_email) = LOWER($1)
         AND LOWER(status) = 'pending'
       ORDER BY created_at DESC LIMIT 10`,
      [auth.email.toLowerCase().trim()],
    )
    return NextResponse.json({ success: true, requests })
  } catch (error) {
    console.error("Top-up requests fetch error:", error)
    return NextResponse.json({ success: false, message: "Unable to load funding requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { amount, transactionHash, screenshotBase64, note, network, fundingMode } = await request.json()
    const authenticatedEmail = auth.email.toLowerCase().trim()

    if (!amount || !transactionHash) {
      return NextResponse.json({ success: false, message: "Amount and transaction hash are required" }, { status: 400 })
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 5 || parsedAmount > 100000) {
      return NextResponse.json({ success: false, message: "Invalid amount. Enter between $5 and $100,000" }, { status: 400 })
    }

    const normalizedTransactionHash = String(transactionHash).trim()
    if (normalizedTransactionHash.length < 10 || normalizedTransactionHash.length > 200) {
      return NextResponse.json({ success: false, message: "Enter a valid transaction hash" }, { status: 400 })
    }

    const existingTx = await query(
      "SELECT id FROM topup_requests WHERE transaction_id = $1",
      [normalizedTransactionHash]
    ) as any[]
    if (existingTx.length > 0) {
      return NextResponse.json({ success: false, message: "This transaction has already been submitted" }, { status: 400 })
    }

    const participants = await query(
      "SELECT id, email FROM participants WHERE LOWER(email) = $1 LIMIT 1",
      [authenticatedEmail]
    ) as any[]
    if (participants.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }
    const participant = participants[0]
    const requestedFundingMode = String(fundingMode || "actual").toLowerCase()

    if (requestedFundingMode === "funded") {
      const priorFundingRequests = await query(
        "SELECT id FROM topup_requests WHERE participant_id = $1 LIMIT 1",
        [participant.id]
      ) as any[]
      if (priorFundingRequests.length > 0) {
        return NextResponse.json({ success: false, message: "Funded-tier funding is available only for the first funding request. Please use Normal Add Fund." }, { status: 409 })
      }
    }

    // Upload screenshot to R2 if provided
    let screenshotUrl: string | null = null
    if (screenshotBase64 && screenshotBase64.startsWith("data:")) {
      try {
        const mimeType = screenshotBase64.match(/data:([^;]+)/)?.[1] || "image/jpeg"
        const fileName = `topup-${participant.id}-${normalizedTransactionHash.slice(0, 8)}-${Date.now()}.${mimeType.split("/")[1] || "jpg"}`
        const uploadedUrl = await uploadBase64ToR2(screenshotBase64, fileName, mimeType)
        if (uploadedUrl) {
          screenshotUrl = uploadedUrl
        } else {
          // Fallback: use base64 if R2 is not available
          screenshotUrl = screenshotBase64
        }
      } catch (uploadErr) {
        console.error("[topup-submit] R2 upload failed:", uploadErr)
        // Continue with base64 as fallback
        screenshotUrl = screenshotBase64
      }
    }

    const paymentMethod = requestedFundingMode === "funded" ? "funded_tier" : network === "INR" ? "inr_bank" : "crypto"
    const insertValues = [participant.id, participant.email, parsedAmount, normalizedTransactionHash, paymentMethod, screenshotUrl]

    try {
      await execute(
        `INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status, screenshot_url)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        insertValues,
      )
    } catch (insertError: any) {
      // Older deployments may not have the optional screenshot_url column yet.
      // The funding request itself must still be recorded safely.
      if (insertError?.code !== "42703" && insertError?.code !== "42701") throw insertError
      await execute(
        `INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        insertValues.slice(0, 5),
      )
    }

    // Log activity (best-effort — table may not exist)
    await execute(
      `INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)`,
      [participant.id, participant.email, "topup_requested", "wallet", `Submitted $${parsedAmount} top-up (tx: ${normalizedTransactionHash.slice(0, 12)}...)`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Top-up request submitted successfully" })
  } catch (error) {
    console.error("Top-up submit error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
