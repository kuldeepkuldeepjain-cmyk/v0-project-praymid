import { NextRequest, NextResponse } from "next/server"
import { query, execute, withTransaction } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { uploadBase64ToR2 } from "@/lib/cloudflare-r2"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const requests = await query(
      `SELECT id, amount, transaction_id, payment_method, status, created_at, promo_code, promo_bonus_amount
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
    const { amount, transactionHash, screenshotBase64, note, network, fundingMode, promoCode } = await request.json()
    const authenticatedEmail = auth.email.toLowerCase().trim()

    if (!amount || !transactionHash) {
      return NextResponse.json({ success: false, message: "Amount and transaction hash or UPI transaction ID are required" }, { status: 400 })
    }

    const requestedAmount = Number(amount)
    if (!Number.isFinite(requestedAmount) || requestedAmount < 5 || requestedAmount > 100000) {
      return NextResponse.json({ success: false, message: "Invalid funding amount. Enter between $5 and $100,000" }, { status: 400 })
    }

    const normalizedTransactionHash = String(transactionHash).trim()
    if (normalizedTransactionHash.length < 10 || normalizedTransactionHash.length > 200) {
      return NextResponse.json({ success: false, message: "Enter a valid transaction hash or UPI transaction ID" }, { status: 400 })
    }

    const existingTx = await query(
      "SELECT id FROM topup_requests WHERE transaction_id = $1",
      [normalizedTransactionHash]
    ) as any[]
    if (existingTx.length > 0) {
      return NextResponse.json({ success: false, message: "This transaction has already been submitted" }, { status: 400 })
    }

    const participants = await query(
      "SELECT id, email, account_type FROM participants WHERE LOWER(email) = $1 LIMIT 1",
      [authenticatedEmail]
    ) as any[]
    if (participants.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }
    const participant = participants[0]
    if (participant.account_type === "challenge") {
      return NextResponse.json({ success: false, message: "Challenge accounts cannot submit standard wallet top-ups." }, { status: 403 })
    }
    const requestedFundingMode = String(fundingMode || "actual").toLowerCase()
    if (requestedFundingMode === "funded" && ![50, 100, 250, 500, 1000].includes(requestedAmount)) {
      return NextResponse.json({ success: false, message: "The first funded top-up must be $50, $100, $250, $500, or $1,000" }, { status: 400 })
    }
    const normalizedPromoCode = String(promoCode || "").trim().toUpperCase().replace(/\s+/g, "")
    if (normalizedPromoCode && !/^[A-Z0-9_-]{3,32}$/.test(normalizedPromoCode)) {
      return NextResponse.json({ success: false, message: "Enter a valid promo code." }, { status: 400 })
    }

    let promoDiscountPercent: number | null = null
    let promoBonusAmount = 0
    if (normalizedPromoCode) {
      const promoRows = await query(
        `SELECT discount_type, discount_value FROM promo_codes
         WHERE code = $1 AND active = TRUE
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (max_uses IS NULL OR used_count < max_uses) LIMIT 1`,
        [normalizedPromoCode],
      ) as Array<{ discount_type: "percent" | "fiat" | "inr"; discount_value: number }>
      if (!promoRows.length) return NextResponse.json({ success: false, message: "Promo code is invalid, expired, or no longer available." }, { status: 400 })

      const promo = promoRows[0]
      const discountValue = Number(promo.discount_value)
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return NextResponse.json({ success: false, message: "This promo code has an invalid discount value." }, { status: 400 })
      }
      if (promo.discount_type === "percent" && discountValue > 100) {
        return NextResponse.json({ success: false, message: "This promo code has an invalid percentage." }, { status: 400 })
      }
      if (promo.discount_type === "inr" && network !== "INR") {
        return NextResponse.json({ success: false, message: "This INR promo code can only be used with UPI / bank transfer." }, { status: 400 })
      }

      let inrRate = 104
      if (promo.discount_type === "inr") {
        const rateRows = await query<{ setting_value: string | null }>(
          "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
          ["topup_usdt_inr_rate"],
        )
        const configuredRate = Number(rateRows[0]?.setting_value)
        if (Number.isFinite(configuredRate) && configuredRate > 0) inrRate = configuredRate
      }

      const rawDiscount = promo.discount_type === "percent"
        ? requestedAmount * discountValue / 100
        : promo.discount_type === "inr"
          ? discountValue / inrRate
          : discountValue
      promoBonusAmount = Number(rawDiscount.toFixed(2))
      if (requestedAmount - promoBonusAmount < 5) {
        return NextResponse.json({ success: false, message: "The promo discount must leave at least $5 to send." }, { status: 400 })
      }
      if (promo.discount_type === "percent") promoDiscountPercent = discountValue
    }
    const payableAmount = Number((requestedAmount - promoBonusAmount).toFixed(2))

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
    await withTransaction(async (client) => {
      if (normalizedPromoCode) {
        const reserved = await client.query(
          `UPDATE promo_codes SET used_count = used_count + 1
           WHERE code = $1 AND active = TRUE
             AND (expires_at IS NULL OR expires_at > NOW())
             AND (max_uses IS NULL OR used_count < max_uses)
           RETURNING id`,
          [normalizedPromoCode],
        )
        if (!reserved.rowCount) throw new Error("PROMO_UNAVAILABLE")
      }
      await client.query(
        `INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status, screenshot_url, promo_code, promo_discount_percent, promo_bonus_amount)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9)`,
        [participant.id, participant.email, payableAmount, normalizedTransactionHash, paymentMethod, screenshotUrl, normalizedPromoCode || null, promoDiscountPercent, promoBonusAmount],
      )
    })

    // Log activity (best-effort — table may not exist)
    await execute(
      `INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)`,
      [participant.id, participant.email, "topup_requested", "wallet", `Submitted $${payableAmount.toFixed(2)} top-up${promoBonusAmount > 0 ? ` after $${promoBonusAmount.toFixed(2)} promo savings` : ""} (tx: ${normalizedTransactionHash.slice(0, 12)}...)`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: promoBonusAmount > 0
        ? `Top-up submitted. Your $${requestedAmount.toFixed(2)} funding request has $${promoBonusAmount.toFixed(2)} in promo savings when approved.`
        : "Top-up request submitted successfully",
      promoCode: normalizedPromoCode || null,
      requestedAmount,
      amountToPay: payableAmount,
      promoBonusAmount,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "PROMO_UNAVAILABLE") {
      return NextResponse.json({ success: false, message: "This promo code has reached its usage limit or is no longer available." }, { status: 409 })
    }
    console.error("Top-up submit error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
