import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { createMt5BridgeAdapter } from "@/lib/mt5-bridge"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  const mt5 = createMt5BridgeAdapter()
  const health = await mt5.health()
  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    venues: [{ id: "mt5-primary", name: "MT5 Bridge", venue: "MT5", priority: 1, ...health }],
  })
}
