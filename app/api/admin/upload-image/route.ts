import { NextRequest, NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/auth"
import { uploadToR2, base64ToBuffer, getMimeTypeFromBase64 } from "@/lib/r2-storage"

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthenticated()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { image } = await request.json()

    if (!image || !image.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 })
    }

    const mimeType = getMimeTypeFromBase64(image)
    const buffer = base64ToBuffer(image)

    // Generate unique filename
    const ext = mimeType.split("/")[1] || "jpg"
    const fileName = `admin-upload-${Date.now()}.${ext}`

    const publicUrl = await uploadToR2(buffer, fileName, mimeType)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error("[upload] error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
