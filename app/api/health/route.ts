import { NextResponse } from "next/server"
import { checkDatabaseHealth, getActiveDBVersion } from "@/lib/db-router"

/**
 * Health Check Endpoint
 * Verifies both v1 and v2 databases are connected and working
 * Usage: GET /api/health
 */
export async function GET() {
  try {
    const health = await checkDatabaseHealth("both")
    const activeVersion = getActiveDBVersion()

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      activeVersion,
      databases: {
        v1: health.v1 ? "connected" : "disconnected",
        v2: health.v2 ? "connected" : "disconnected",
      },
      environment: {
        USE_DB_V2: process.env.USE_DB_V2 || "not set",
        HAS_DATABASE_URL_V2: !!process.env.DATABASE_URL_V2 || !!process.env.NEON_DATABASE_URL_V2 ? "yes" : "no",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
