import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  
  return NextResponse.json({ 
    success: false, 
    error: "Automatch feature has been disabled",
    message: "Payout-contribution automatch is currently disabled."
  }, { status: 403 })
}
