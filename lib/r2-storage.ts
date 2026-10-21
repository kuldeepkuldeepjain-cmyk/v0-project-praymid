import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.CLOUDFLARE_S3_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_S3_SECRET_ACCESS_KEY
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL

const s3Client = new S3Client({
  region: "auto",
  credentials: {
    accessKeyId: ACCESS_KEY_ID || "",
    secretAccessKey: SECRET_ACCESS_KEY || "",
  },
  endpoint: ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
})

/**
 * Upload a file to Cloudflare R2
 * @param fileBuffer Buffer or Uint8Array of file content
 * @param fileName Unique filename (e.g., "participant_photo_${Date.now()}.jpg")
 * @param contentType MIME type (e.g., "image/jpeg")
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      })
    )
    if (!PUBLIC_URL) throw new Error("Cloudflare R2 public URL is not configured")
    return `${PUBLIC_URL.replace(/\/$/, "")}/${fileName}`
  } catch (error) {
    console.error("[R2] Upload error:", error)
    throw new Error("Failed to upload image")
  }
}

/**
 * Delete a file from Cloudflare R2
 * @param fileUrl Public URL or just the key (filename)
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  try {
    // Extract filename from URL if full URL is provided
    const fileName = fileUrl.includes("/") ? fileUrl.split("/").pop()! : fileUrl
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
      })
    )
  } catch (error) {
    console.error("[R2] Delete error:", error)
    throw new Error("Failed to delete image")
  }
}

/**
 * Convert base64 to Buffer for R2 upload
 */
export function base64ToBuffer(base64: string): Buffer {
  const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  if (!matches) throw new Error("Invalid base64 format")
  return Buffer.from(matches[2], "base64")
}

/**
 * Get MIME type from base64 data URL
 */
export function getMimeTypeFromBase64(base64: string): string {
  const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,/)
  return matches ? matches[1] : "image/jpeg"
}
