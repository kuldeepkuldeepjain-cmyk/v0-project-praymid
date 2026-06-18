import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  
  return NextResponse.json({ 
    success: false, 
    error: "Auto-match payout for contribution has been disabled",
    message: "This feature is currently disabled. Please use manual matching instead."
  }, { status: 403 })
}
