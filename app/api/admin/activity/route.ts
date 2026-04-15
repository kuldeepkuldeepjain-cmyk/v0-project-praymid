import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

// Store activity logs globally
interface GlobalWithActivity {
  activityLogs?: any[]
}

const globalWithActivity = globalThis as GlobalWithActivity

if (!globalWithActivity.activityLogs) {
  globalWithActivity.activityLogs = []
}

export function addActivityLog(log: any) {
  if (!globalWithActivity.activityLogs) {
    globalWithActivity.activityLogs = []
  }
  globalWithActivity.activityLogs.unshift({
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
  })

  // Keep only last 100 logs
  if (globalWithActivity.activityLogs.length > 100) {
    globalWithActivity.activityLogs = globalWithActivity.activityLogs.slice(0, 100)
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminSession(request)
  if (!authResult.ok) return authResult.response
  try {
    const logs = globalWithActivity.activityLogs || []
    return NextResponse.json({ activities: logs })
  } catch (error) {
    console.error("[API] Error fetching activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
