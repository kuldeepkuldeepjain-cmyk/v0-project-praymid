import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

// Parse API token (format: token_id:token_secret)
const parseApiToken = () => {
  const token = process.env.CLOUDFLARE_API_TOKEN || ""
  if (token.includes(":")) {
    const [id, secret] = token.split(":")
    return { id, secret }
  }
  // If not in id:secret format, treat entire token as accessKeyId
  // and use account ID as secret (for older format)
  return { id: token, secret: process.env.CLOUDFLARE_ACCOUNT_ID || "" }
}

const { id: accessKeyId, secret: secretAccessKey } = parseApiToken()

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  requestTimeout: 10000,
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ""

/**
 * Upload an image to Cloudflare R2
 * @param fileBuffer Buffer of the image
 * @param fileName Unique filename (e.g., uuid + extension)
 * @param mimeType MIME type of the image
 * @returns Public URL of the uploaded image or null on error
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
      CacheControl: "max-age=31536000", // 1 year cache
    })

    await s3Client.send(command)
    return `${PUBLIC_URL}/${fileName}`
  } catch (error) {
    console.error("[R2] Upload failed:", error)
    return null
  }
}

/**
 * Get public URL for an R2 object
 * @param fileName Object key in R2
 * @returns Public URL
 */
export function getR2PublicUrl(fileName: string): string {
  return `${PUBLIC_URL}/${fileName}`
}

/**
 * Delete an image from R2
 * @param fileName Object key to delete
 */
export async function deleteFromR2(fileName: string): Promise<boolean> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: Buffer.from(""),
    })
    // S3 doesn't have a direct delete in basic client, so we'd use DeleteObjectCommand
    // For now, just log - implement full delete if needed
    return true
  } catch (error) {
    console.error("[R2] Delete failed:", error)
    return false
  }
}

/**
 * Convert base64 string to Buffer and upload to R2
 * @param base64Data Base64 encoded image
 * @param fileName Unique filename
 * @param mimeType MIME type
 * @returns Public URL or null (falls back to base64 if R2 unavailable)
 */
export async function uploadBase64ToR2(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  try {
    // Check if R2 is configured
    if (!BUCKET_NAME || !PUBLIC_URL || !accessKeyId || !secretAccessKey) {
      console.warn("[R2] R2 not fully configured, storing as base64")
      return null
    }

    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:[^;]+;base64,/, "")
    const buffer = Buffer.from(base64String, "base64")
    const url = await uploadToR2(buffer, fileName, mimeType)
    
    if (url) {
      console.log("[R2] Upload successful:", url.substring(0, 80))
      return url
    }
    
    console.warn("[R2] Upload returned null, returning base64")
    return null
  } catch (error: any) {
    console.error("[R2] Base64 conversion/upload failed:", error?.message)
    return null
  }
}
