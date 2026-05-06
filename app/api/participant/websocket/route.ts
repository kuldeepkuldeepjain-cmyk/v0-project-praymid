import { NextRequest } from "next/server"
import { getPool } from "@/lib/db"

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")
  const token = request.nextUrl.searchParams.get("token")

  if (!email || !token) {
    return new Response("Missing email or token", { status: 400 })
  }

  try {
    const db = getPool()!
    const result = await db.query("SELECT email FROM participants WHERE email = ?LIMIT 1", [email])
    if (result.rows.length === 0) {
      return new Response("Unauthorized", { status: 401 })
    }
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  if (request.headers.get("upgrade") !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 })
  }

  return new Response(null, {
    status: 101,
    headers: { Upgrade: "websocket", Connection: "Upgrade" },
  })
}
