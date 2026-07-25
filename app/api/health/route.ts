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
        HAS_NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL ? "yes" : "no",
        HAS_DATABASE_URL: !!process.env.DATABASE_URL ? "yes" : "no",
        HAS_POSTGRES_URL: !!process.env.POSTGRES_URL ? "yes" : "no",
        HAS_NEON_POSTGRES_URL: !!process.env.NEON_POSTGRES_URL ? "yes" : "no",
        NEON_DATABASE_URL_PREFIX: process.env.NEON_DATABASE_URL ? process.env.NEON_DATABASE_URL.slice(0, 30) + "..." : "not set",
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
