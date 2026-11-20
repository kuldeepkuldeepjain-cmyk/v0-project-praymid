import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    success: false,
    error: "Direct reactivation is no longer available. Approve a new Funded restart plan payment in Top-up Requests.",
  }, { status: 410 })
}
