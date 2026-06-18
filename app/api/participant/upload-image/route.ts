import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { uploadToR2, base64ToBuffer, getMimeTypeFromBase64 } from "@/lib/r2-storage"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await requireParticipantSession()
    const email = session.email

    const { image, type } = await request.json()

    if (!image || !image.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 })
    }

    const mimeType = getMimeTypeFromBase64(image)
    const buffer = base64ToBuffer(image)

    // Generate unique filename with type
    const ext = mimeType.split("/")[1] || "jpg"
    const fileName = `participant-${type}-${Date.now()}.${ext}`

    const publicUrl = await uploadToR2(buffer, fileName, mimeType)

    // Update participant profile picture if type is "avatar"
    if (type === "avatar") {
      const pool = getPool()
      if (!pool) {
        return NextResponse.json({ success: false, error: "Database connection failed" }, { status: 500 })
      }
      await pool.query("UPDATE participants SET profile_picture_url = $1 WHERE email = $2", [publicUrl, email])
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: any) {
    console.error("[participant-upload] error:", error)
    if (error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
