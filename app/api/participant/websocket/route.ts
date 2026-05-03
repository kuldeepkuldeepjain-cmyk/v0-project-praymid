import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * WebSocket verification endpoint.
 * Verifies participant exists before upgrade; actual WS handling requires
 * a persistent server (e.g. Socket.io). This route confirms auth only.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")
  const token = request.nextUrl.searchParams.get("token")

  if (!email || !token) {
    return new NextResponse("Missing email or token", { status: 400 })
  }

  const rows = await sql`SELECT email FROM participants WHERE email = ${email} LIMIT 1`
  if (!rows[0]) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  if (request.headers.get("upgrade") !== "websocket") {
    return new NextResponse("Expected Upgrade: websocket", { status: 426 })
  }

  return new NextResponse(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  })
}
