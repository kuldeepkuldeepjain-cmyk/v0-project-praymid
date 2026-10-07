import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { createMt5BridgeAdapter } from "@/lib/mt5-bridge"
import { createFxcmProAdapter } from "@/lib/fxcm-pro"
import { createCTraderAdapter } from "@/lib/ctrader"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return auth.response

  const mt5 = createMt5BridgeAdapter()
  const cTrader = createCTraderAdapter()
  const fxcm = createFxcmProAdapter()
  const [mt5Health, cTraderHealth, fxcmHealth] = await Promise.all([mt5.health(), cTrader.health(), fxcm.health()])
  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    venues: [
      { id: "mt5-primary", name: "MT5 Bridge", venue: "MT5", priority: 1, ...mt5Health },
      { id: "ctrader-primary", name: "cTrader", venue: "CTRADER", priority: 2, ...cTraderHealth },
      { id: "fxcm-pro-primary", name: "FXCM Pro", venue: "FXCM_PRO", priority: 3, ...fxcmHealth },
    ],
  })
}
