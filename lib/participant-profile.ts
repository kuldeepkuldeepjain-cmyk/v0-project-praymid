import { z } from "zod"

export interface ParticipantProfile {
  id: string
  email: string
  username: string | null
  full_name: string | null
  bep20_address: string | null
  wallet_address?: string | null
  profile_image: string | null
  account_type: string | null
  country?: string | null
  created_at: string | null
  referral_code: string | null
  pinConfigured?: boolean
}

export interface IdentityVerification {
  id: string
  legal_name: string
  date_of_birth: string | null
  country: string
  document_type: string
  document_number: string | null
  status: string
  rejection_reason: string | null
  submitted_at: string
  reviewed_at: string | null
}

export const profileDetailsSchema = z.object({
  full_name: z.string().trim().max(100, "Use 100 characters or fewer."),
  username: z.string().trim().min(2, "Use at least 2 characters.").max(50, "Use 50 characters or fewer.").refine(value => !/[<>\r\n]/.test(value), "Use a valid username."),
  bep20_address: z.string().trim().refine(value => !value || /^0x[a-fA-F0-9]{40}$/.test(value), "Enter a valid BEP20 address: 0x followed by 40 hexadecimal characters."),
})

export type ProfileDetails = z.infer<typeof profileDetailsSchema>

export const documentTypes: Record<string, string> = {
  passport: "Passport",
  national_id: "National ID",
  drivers_license: "Driver’s license",
}

export const identityDetailsSchema = z.object({
  legal_name: z.string().trim().min(2, "Enter your full legal name.").max(150, "Use 150 characters or fewer."),
  country: z.string().trim().min(2, "Enter your country of residence.").max(100),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.").refine(value => {
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= new Date().toISOString().slice(0, 10)
  }, "Enter a valid date of birth in the past."),
  document_type: z.enum(["passport", "national_id", "drivers_license"], { errorMap: () => ({ message: "Select an identity document." }) }),
  document_number: z.string().trim().min(3, "Enter the number shown on your document.").max(80),
})

export type IdentityDetails = z.infer<typeof identityDetailsSchema>
export type IdentityImageField = "document_front_url" | "document_back_url" | "selfie_url"
export type IdentityImages = Record<IdentityImageField, string>

export function verificationState(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase()
  if (["approved", "verified", "completed", "complete"].includes(normalized)) return "verified"
  if (["pending", "submitted", "under_review", "in_review"].includes(normalized)) return "review"
  if (["rejected", "resubmission_required"].includes(normalized)) return "rejected"
  return "not_started"
}

export function verificationLabel(status?: string | null) {
  const state = verificationState(status)
  return state === "verified" ? "Identity verified" : state === "review" ? "In review" : state === "rejected" ? "Action needed" : "Not verified"
}

export function accountLabel(accountType?: string | null) {
  const normalized = String(accountType || "").toLowerCase().replace(/[\s_-]+/g, "")
  return ["funded", "fundedaccount", "fundedtier", "fundingtier"].includes(normalized) ? "Funded account" : ["challenge", "challengeaccount"].includes(normalized) ? "Challenge account" : "Normal account"
}

export function profileDate(value?: string | null) {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date)
}

export async function prepareProfileImage(file: File, avatar = false): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.")
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose an image smaller than 15 MB.")
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("This image could not be read. Please choose it again."))
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("This image could not be opened. Try a different photo."))
    image.src = source
  })
  const scale = Math.min(1, (avatar ? 640 : 1600) / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Image processing is unavailable. Please try another browser.")
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  // Three base64 images must also fit within the request limit if storage falls back to database images.
  const maxBytes = avatar ? 500_000 : 1_000_000
  for (let quality = 0.9; quality >= 0.34; quality -= 0.08) {
    const result = canvas.toDataURL("image/jpeg", quality)
    if (Math.ceil((result.length - result.indexOf(",") - 1) * 3 / 4) <= maxBytes) return result
  }
  throw new Error("This photo could not be optimized. Try a closer, well-lit photo without a large background.")
}
