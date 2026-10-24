import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { uploadToR2, base64ToBuffer, getMimeTypeFromBase64 } from "@/lib/r2-storage"
import { getPool } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await requireParticipantSession()
    if (!session.ok) return session.response
    const email = session.email

    const { image, type } = await request.json()

    if (!image || !image.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 })
    }

    const mimeType = getMimeTypeFromBase64(image)
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return NextResponse.json({ error: "Only JPG, PNG, or WEBP images are supported" }, { status: 400 })
    }
    const buffer = base64ToBuffer(image)
    if (!buffer.length || buffer.length > 5.5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 6 MB after compression" }, { status: 400 })
    }
    if (!type || !/^[a-z0-9-]+$/i.test(type)) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 })
    }

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
    const message = error instanceof Error ? error.message : "Unable to save image"
    const safeMessage = /not configured/i.test(message)
      ? "Secure image storage is not configured. Please contact support."
      : /R2 upload failed/i.test(message)
        ? "Secure image storage could not save this image. The image was compressed below 6 MB; please try again."
        : "Unable to save this image right now. Please try again."
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
