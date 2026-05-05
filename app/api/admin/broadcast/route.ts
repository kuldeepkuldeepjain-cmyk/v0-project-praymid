import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { message } = await request.json()
    if (!message || typeof message !== "string") return NextResponse.json({ error: "Message is required" }, { status: 400 })

    const db = getPool()!
    const participantsRes = await db.query(`SELECT email FROM participants`)
    if (!participantsRes.rows.length) return NextResponse.json({ error: "No participants found" }, { status: 404 })

    for (const p of participantsRes.rows) {
      await db.query(
        `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'info','Admin Announcement',$2,false)`,
        [p.email, message.trim()]
      )
    }

    await db.query(
      `INSERT INTO audit_logs(action,description,created_at) VALUES('global_broadcast',$1,NOW())`,
      [`Admin sent global broadcast: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`]
    )

    return NextResponse.json({ success: true, message: "Broadcast sent successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
