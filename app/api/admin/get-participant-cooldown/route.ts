import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) {
      return NextResponse.json({ success: false, error: "Email parameter required" }, { status: 400 })
    }

    const db = getPool()!

    // Get participant cooldown info
    const pRes = await db.query(
      `SELECT 
        id, 
        email, 
        full_name, 
        username,
        next_contribution_date,
        account_balance,
        total_earnings,
        created_at
       FROM participants 
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    )

    if (!pRes.rows.length) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const participant = pRes.rows[0]
    const now = new Date()
    const nextContributionDate = participant.next_contribution_date ? new Date(participant.next_contribution_date) : null

    let cooldownInfo = {
      isOnCooldown: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      nextAvailableDate: null,
      formattedDate: null,
    }

    if (nextContributionDate && nextContributionDate > now) {
      const diffMs = nextContributionDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))

      cooldownInfo = {
        isOnCooldown: true,
        daysRemaining: diffDays,
        hoursRemaining: diffHours,
        nextAvailableDate: nextContributionDate.toISOString(),
        formattedDate: nextContributionDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
    }

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        email: participant.email,
        name: participant.full_name || participant.username,
        accountBalance: participant.account_balance,
        totalEarnings: participant.total_earnings,
        createdAt: participant.created_at,
      },
      cooldown: cooldownInfo,
    })
  } catch (error) {
    console.error("[v0] Error fetching cooldown info:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch cooldown info" },
      { status: 500 }
    )
  }
}
