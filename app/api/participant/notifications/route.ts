import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    const notifications = await sql`
      SELECT id, title, message, type, read_status, created_at
      FROM notifications
      WHERE user_email = ${email}
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ success: true, notifications: notifications || [] })
  } catch (error) {
    console.error("[v0] Error fetching notifications:", error)
    return NextResponse.json({ success: false, notifications: [] }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ids, read_status } = body

    if (ids && Array.isArray(ids)) {
      // Mark multiple as read
      await sql`UPDATE notifications SET read_status = true WHERE id = ANY(${ids}::uuid[])`
    } else if (id) {
      await sql`UPDATE notifications SET read_status = ${read_status ?? true} WHERE id = ${id}`
    } else {
      return NextResponse.json({ success: false, error: "id or ids required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating notification:", error)
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 })
    }

    await sql`DELETE FROM notifications WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 })
  }
}
