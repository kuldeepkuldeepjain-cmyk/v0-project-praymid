import { NextRequest, NextResponse } from "next/server"
import { query, execute, withTransaction } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { FUNDED_PLANS, getFundedBaseAmount } from "@/lib/funded-account"
import { getChallengePlan } from "@/lib/challenge-account"

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const rows = await query(
      `SELECT id, participant_email, participant_id, amount, status, created_at,
              payment_method, transaction_id, admin_notes, screenshot_url, reviewed_at, promo_code, promo_discount_percent, promo_bonus_amount
       FROM topup_requests ORDER BY created_at DESC`
    )
    return NextResponse.json({ success: true, requests: rows })
  } catch (error) {
    console.error("[topup-requests] GET error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const { requestId, adminNotes } = await req.json()
    if (!requestId) {
      return NextResponse.json({ success: false, message: "Missing requestId" }, { status: 400 })
    }

    await execute(
      "UPDATE topup_requests SET admin_notes = $1 WHERE id = $2",
      [adminNotes?.trim() || null, requestId]
    )
    return NextResponse.json({ success: true, message: "Admin notes updated" })
  } catch (error) {
    console.error("[topup-requests] PATCH error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const { requestId, action, adminNotes, rejectionReason } = await req.json()
    const adminEmail = auth.email
    if (!requestId || !action) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 })
    }

    const rows = await query("SELECT * FROM topup_requests WHERE id = $1", [requestId])
    if (!rows.length) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 })
    }

    const topup = rows[0] as any
    // Direct crypto deposits use `pending`; funded-account approval requests
    // use `pending_collection` until an admin confirms the credited balance.
    const pendingStatuses = new Set(["pending", "pending_collection"])
    if (!pendingStatuses.has(String(topup.status).toLowerCase())) {
      return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 })
    }

    if (topup.payment_method === "challenge") {
      const reviewResult = await withTransaction(async (client) => {
        const paymentResult = await client.query(
          `SELECT id, participant_id, participant_email, amount, status, admin_notes
           FROM topup_requests WHERE id = $1 FOR UPDATE`,
          [requestId],
        )
        const payment = paymentResult.rows[0]
        if (!payment || !pendingStatuses.has(String(payment.status).toLowerCase())) {
          return { error: "Request already processed", status: 409 }
        }

        const participantResult = await client.query(
          `SELECT id, email, account_type, challenge_plan_key, challenge_status
           FROM participants WHERE id = $1 FOR UPDATE`,
          [payment.participant_id],
        )
        const participant = participantResult.rows[0]
        if (!participant) return { error: "Participant not found", status: 404 }
        const plan = getChallengePlan(participant.challenge_plan_key)
        if (participant.account_type !== "challenge" || participant.challenge_status !== "pending_payment" || !plan || Math.abs(Number(payment.amount) - plan.fee) > 0.01) {
          return { error: "Challenge payment does not match an account awaiting review.", status: 409 }
        }

        const reviewText = String(adminNotes || rejectionReason || "").trim().slice(0, 1000)
        const storedNotes = String(payment.admin_notes || "")
        const notes = reviewText ? `${storedNotes}${storedNotes ? "\\n" : ""}Admin review: ${reviewText}` : storedNotes || null
        const claimed = await client.query(
          `UPDATE topup_requests SET status = 'processing'
           WHERE id = $1 AND LOWER(status) = 'pending' RETURNING id`,
          [requestId],
        )
        if (!claimed.rowCount) return { error: "Request already processed", status: 409 }

        if (action === "approve") {
          await client.query(
            `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual',
               close_time = COALESCE(close_time, NOW()::text), updated_at = NOW()
             WHERE LOWER(participant_email) = LOWER($1) AND status IN ('open', 'pending')`,
            [participant.email],
          )
          await client.query(
            `UPDATE participants SET account_type = 'challenge', account_balance = $1,
               challenge_status = 'active', challenge_started_at = NOW(),
               challenge_passed_at = NULL, challenge_passed_equity = NULL, challenge_failed_at = NULL,
               challenge_peak_equity = $1, challenge_day_start_equity = $1,
               challenge_day_start_date = (NOW() AT TIME ZONE 'UTC')::date,
               challenge_trading_days = 0, challenge_last_trading_date = NULL,
               updated_at = NOW()
             WHERE id = $2`,
            [plan.startingBalance, participant.id],
          )
          await client.query(
            `UPDATE topup_requests SET status = 'completed', reviewed_at = NOW(), admin_notes = $1 WHERE id = $2`,
            [notes, requestId],
          )
          await client.query(
            `INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details)
             VALUES ($1, $2, 'challenge_activated', 'challenge_account', $3)`,
            [participant.id, participant.email, `Admin ${adminEmail} approved the ${plan.name} challenge fee; $${plan.startingBalance.toLocaleString()} virtual balance activated`],
          ).catch(() => {})
          return { success: true, status: "approved", planName: plan.name, startingBalance: plan.startingBalance }
        }

        await client.query(
          `UPDATE participants SET challenge_status = 'payment_rejected', updated_at = NOW()
           WHERE id = $1 AND challenge_status = 'pending_payment'`,
          [participant.id],
        )
        await client.query(
          `UPDATE topup_requests SET status = 'rejected', reviewed_at = NOW(), admin_notes = $1 WHERE id = $2`,
          [notes, requestId],
        )
        await client.query(
          `INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details)
           VALUES ($1, $2, 'challenge_payment_rejected', 'challenge_account', $3)`,
          [participant.id, participant.email, `Admin ${adminEmail} rejected the ${plan.name} challenge fee${reviewText ? `: ${reviewText}` : ""}`],
        ).catch(() => {})
        return { success: true, status: "rejected", planName: plan.name }
      })

      if ("error" in reviewResult) {
        return NextResponse.json({ success: false, message: reviewResult.error }, {
          status: typeof reviewResult.status === "number" ? reviewResult.status : 500,
        })
      }
      if (reviewResult.status === "approved") {
        const startingBalance = Number(reviewResult.startingBalance)
        return NextResponse.json({
          success: true,
          message: `${reviewResult.planName} activated with a $${startingBalance.toLocaleString()} virtual balance. The payment was not credited to the participant wallet.`,
          creditedAmount: 0,
          challengeStartingBalance: startingBalance,
        })
      }
      return NextResponse.json({ success: true, message: `${reviewResult.planName} payment was rejected.` })
    }

    if (action === "approve") {
      const approval = await withTransaction(async (client) => {
        const requestResult = await client.query(
          `SELECT participant_id, participant_email, amount, payment_method, status, promo_bonus_amount
           FROM topup_requests WHERE id = $1 FOR UPDATE`,
          [requestId],
        )
        const payment = requestResult.rows[0]
        if (!payment || !pendingStatuses.has(String(payment.status).toLowerCase())) {
          throw new Error("TOPUP_ALREADY_PROCESSED")
        }

        const participantResult = await client.query(
          `SELECT account_balance, account_type, funded_amount, funded_initial_balance, funded_breach_status,
                  (funded_breach_at IS NULL OR funded_breach_at <= (SELECT created_at FROM topup_requests WHERE id = $2)) AS payment_after_breach
           FROM participants WHERE id = $1 FOR UPDATE`,
          [payment.participant_id, requestId],
        )
        const participant = participantResult.rows[0]
        if (!participant) throw new Error("TOPUP_PARTICIPANT_MISSING")
        if (participant.account_type === "challenge" && payment.payment_method !== "funded_tier") {
          throw new Error("TOPUP_CHALLENGE_ACCOUNT")
        }

        const depositAmount = Number(payment.amount)
        const promoBonusAmount = Number(payment.promo_bonus_amount || 0)
        if (!Number.isFinite(depositAmount) || depositAmount <= 0 || !Number.isFinite(promoBonusAmount) || promoBonusAmount < 0) {
          throw new Error("TOPUP_INVALID_AMOUNT")
        }
        const requestedFundingAmount = Number((depositAmount + promoBonusAmount).toFixed(2))
        const isFundedAccount = participant.account_type === "funded"
        const isFundedRestart = payment.payment_method === "funded_restart"
        const isBreached = isFundedAccount && participant.funded_breach_status === "breached"
        if (isBreached && !isFundedRestart) throw new Error("TOPUP_RESTART_REQUIRED")
        if (isFundedRestart && (!isBreached || !participant.payment_after_breach)) throw new Error("TOPUP_STALE_RESTART")

        const isChallengeUpgrade = participant.account_type === "challenge" && payment.payment_method === "funded_tier"
        const isInitialFundedTopUp = payment.payment_method === "funded_tier"
          && (isChallengeUpgrade || (isFundedAccount && !Number(participant.funded_initial_balance || 0) && Number(participant.account_balance || 0) <= 0))
        const startsFundedPlan = isInitialFundedTopUp || isFundedRestart
        const fundedPlan = FUNDED_PLANS.find((plan) => plan.topUpAmount === requestedFundingAmount)
        if (startsFundedPlan && !fundedPlan) throw new Error("TOPUP_INVALID_FUNDED_TIER")

        const creditedAmount = startsFundedPlan ? fundedPlan!.baseAmount : requestedFundingAmount
        const newBalance = isChallengeUpgrade || isFundedRestart ? creditedAmount : Number(participant.account_balance || 0) + creditedAmount
        const fundedBaseAmount = startsFundedPlan ? creditedAmount : getFundedBaseAmount(newBalance, participant.funded_amount)

        if (isFundedRestart) {
          await client.query(
            `UPDATE forex_trades SET status = 'cancelled', close_reason = 'account_breach',
               close_time = COALESCE(close_time, NOW()::text), updated_at = NOW()
             WHERE LOWER(participant_email) = LOWER($1) AND status IN ('open', 'pending')`,
            [payment.participant_email],
          )
          await client.query(
            `UPDATE predictions SET status = 'settled', result = 'cancelled', profit_loss = 0, closed_at = NOW()
             WHERE LOWER(participant_email) = LOWER($1) AND balance_source = 'wallet' AND status IN ('pending', 'settling')`,
            [payment.participant_email],
          )
        }

        await client.query(
          isFundedAccount || isChallengeUpgrade
            ? `UPDATE participants SET account_balance = $1,
                 account_type = CASE WHEN $3 THEN 'funded' ELSE account_type END,
                 challenge_status = CASE WHEN $5 THEN 'switched_to_funded' ELSE challenge_status END,
                 funded_initial_balance = CASE WHEN $3 THEN $1 ELSE funded_initial_balance END,
                 funded_amount = CASE WHEN $3 THEN $4 ELSE funded_amount END,
                 funded_breach_at = CASE WHEN $6 THEN NULL ELSE funded_breach_at END,
                 funded_breach_balance = CASE WHEN $6 THEN NULL ELSE funded_breach_balance END,
                 funded_breach_equity = CASE WHEN $6 THEN NULL ELSE funded_breach_equity END,
                 is_active = CASE WHEN $6 THEN TRUE ELSE is_active END,
                 account_frozen = false, is_frozen = false, status = 'active', funded_breach_status = 'clear', updated_at = NOW()
               WHERE id = $2`
            : "UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2",
          isFundedAccount || isChallengeUpgrade
            ? [newBalance, payment.participant_id, startsFundedPlan, fundedBaseAmount, isChallengeUpgrade, isFundedRestart]
            : [newBalance, payment.participant_id],
        )

        await client.query(
          `UPDATE topup_requests SET status = 'completed', reviewed_at = NOW(), admin_notes = $1
           WHERE id = $2 AND LOWER(status) IN ('pending', 'pending_collection')`,
          [adminNotes || null, requestId],
        )

        // Credit $5 only after a qualifying funded event: $50+ for normal accounts,
        // or a funded-account tier whose credited funded amount is $50+.
        let referrerEmail: string | null = null
        if (creditedAmount >= 50) {
          const referrerResult = await client.query(
            `SELECT id, email, account_balance FROM participants
             WHERE referral_code = (SELECT referred_by FROM participants WHERE id = $1)
               AND id <> $1 FOR UPDATE`,
            [payment.participant_id],
          )
          const referrer = referrerResult.rows[0]
          if (referrer) {
            const bonusDescription = `Referral bonus - ${payment.participant_email} added funds`
            const previousBonus = await client.query(
              `SELECT id FROM transactions
               WHERE LOWER(participant_email) = LOWER($1) AND description IN ($2, $3) LIMIT 1`,
              [referrer.email, bonusDescription, `Referral bonus - ${payment.participant_email} activated`],
            )
            if (!previousBonus.rowCount) {
              const referrerBonus = 5
              const referrerBalanceBefore = Number(referrer.account_balance || 0)
              const referrerNewBalance = referrerBalanceBefore + referrerBonus
              await client.query(
                `UPDATE participants SET account_balance = COALESCE(account_balance, 0) + $1,
                   referral_earnings = referral_earnings + $1, updated_at = NOW() WHERE id = $2`,
                [referrerBonus, referrer.id],
              )
              await client.query(
                `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
                 VALUES ($1, 'referral_bonus', $2, $3, $4, $5)`,
                [referrer.email, referrerBonus, bonusDescription, referrerBalanceBefore, referrerNewBalance],
              )
              referrerEmail = referrer.email
            }
          }
        }

        return {
          participantId: payment.participant_id,
          participantEmail: payment.participant_email,
          amount: depositAmount,
          newBalance,
          creditedAmount,
          promoBonusAmount,
          isFundedAccount,
          accountRevived: isFundedRestart,
          referrerEmail,
        }
      })
      await execute(
        "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)",
        [approval.participantId, approval.participantEmail, "topup_approved", "wallet", `Admin ${adminEmail} approved $${approval.amount} top-up${approval.isFundedAccount ? ` for a $${approval.creditedAmount.toLocaleString()} funded account` : ""}`],
      ).catch(() => {})
      if (approval.referrerEmail) {
        await execute(
          `INSERT INTO activity_logs (actor_email, action, details, target_type)
           VALUES ($1, 'referral_bonus_credited', $2, 'referral_bonus')`,
          [approval.referrerEmail, `Earned $5 referral bonus from ${approval.participantEmail} adding funds`],
        ).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        message: approval.isFundedAccount
          ? `Top-up approved and $${approval.creditedAmount.toLocaleString()} funded balance credited${approval.accountRevived ? "; account is live again" : ""}`
          : "Top-up approved and wallet credited",
        newBalance: approval.newBalance,
        creditedAmount: approval.creditedAmount,
        promoBonusAmount: approval.promoBonusAmount,
        accountRevived: approval.accountRevived,
      })
    }

    await withTransaction(async (client) => {
      const rejected = await client.query(
        `UPDATE topup_requests SET status = 'rejected', reviewed_at = NOW(), admin_notes = $1
         WHERE id = $2 AND LOWER(status) IN ('pending', 'pending_collection')
         RETURNING promo_code`,
        [adminNotes || null, requestId],
      )
      if (!rejected.rowCount) throw new Error("TOPUP_ALREADY_PROCESSED")
      const reservedPromoCode = rejected.rows[0]?.promo_code
      if (reservedPromoCode) {
        await client.query(
          "UPDATE promo_codes SET used_count = GREATEST(used_count - 1, 0) WHERE code = $1",
          [reservedPromoCode],
        )
      }
    })
    await execute(
      "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,$3,$4,$5)",
      [topup.participant_id, topup.participant_email, "topup_rejected", "wallet", `Admin ${adminEmail} rejected $${topup.amount} top-up`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Top-up rejected" })
  } catch (error) {
    if (error instanceof Error) {
      const knownErrors: Record<string, { message: string; status: number }> = {
        TOPUP_ALREADY_PROCESSED: { message: "Request already processed", status: 409 },
        TOPUP_PARTICIPANT_MISSING: { message: "Participant not found", status: 404 },
        TOPUP_CHALLENGE_ACCOUNT: { message: "Challenge accounts cannot receive standard wallet top-ups.", status: 403 },
        TOPUP_INVALID_AMOUNT: { message: "Invalid top-up amount", status: 400 },
        TOPUP_INVALID_FUNDED_TIER: { message: "The payment does not match a valid Funded plan fee.", status: 400 },
        TOPUP_RESTART_REQUIRED: { message: "This account is breached. Only a new Funded restart plan payment can reactivate it.", status: 409 },
        TOPUP_STALE_RESTART: { message: "This payment does not match the current funded account breach.", status: 409 },
      }
      const knownError = knownErrors[error.message]
      if (knownError) return NextResponse.json({ success: false, message: knownError.message }, { status: knownError.status })
    }
    console.error("[topup-requests] POST error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
