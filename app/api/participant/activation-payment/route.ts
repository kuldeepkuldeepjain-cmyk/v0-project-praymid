import { type NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const formData = await request.formData()
    const email = formData.get("email") as string
    const wallet = formData.get("wallet") as string
    const paymentMethod = formData.get("paymentMethod") as "crypto" | "bank"
    const screenshot = formData.get("screenshot") as File

    if (!email || !wallet || !screenshot || !paymentMethod) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // In production, this would:
    // 1. Upload screenshot to blob storage
    // 2. Update user record with activation_payment_status = "pending"
    // 3. Create audit log entry
    // 4. Send notification to admin

    console.log("[v0] Activation payment submitted:", { email, wallet, paymentMethod })

    return NextResponse.json({
      success: true,
      message: "Activation payment submitted for review",
      status: "pending",
    })
  } catch (error) {
    console.error("[v0] Activation payment error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
