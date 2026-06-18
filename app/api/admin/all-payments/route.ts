import { NextRequest, NextResponse } from "next/server"
import { mockPayments } from "@/lib/mock-data"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    payments: mockPayments,
    success: true,
  })
}
