import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      unixTime: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  )
}
