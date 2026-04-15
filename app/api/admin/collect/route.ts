import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    // Simulate collection process
    // In production, this would:
    // 1. Verify the payment exists and is approved
    // 2. Check balance and allowance on-chain
    // 3. Execute the collection transaction
    // 4. Update database with transaction hash
    // 5. Update payment status to "collected"

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock successful collection
    const txHash = "0x" + Math.random().toString(16).substring(2, 66)

    return NextResponse.json({
      success: true,
      txHash,
      message: "Tokens collected successfully",
    })
  } catch (error) {
    console.error("[v0] Collection error:", error)
    return NextResponse.json(
      { error: "Collection failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
