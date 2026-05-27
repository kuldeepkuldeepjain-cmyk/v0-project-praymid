import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    const notifications = await query(
      `SELECT id, title, message, type, read_status, created_at
       FROM notifications
       WHERE user_email = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [email]
    )

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
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(",")
      await execute(
        `UPDATE notifications SET read_status = true WHERE id = ANY(ARRAY[${placeholders}]::uuid[])`,
        ids
      )
    } else if (id) {
      await execute(
        `UPDATE notifications SET read_status = $1 WHERE id = $2`,
        [read_status ?? true, id]
      )
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

    await execute(`DELETE FROM notifications WHERE id = $1`, [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
    return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 })
  }
}
