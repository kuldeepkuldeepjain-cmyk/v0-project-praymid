import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  
  return NextResponse.json({ 
    success: false, 
    error: "Manual payout-contribution matching has been disabled",
    message: "This feature is currently disabled."
  }, { status: 403 })
}
