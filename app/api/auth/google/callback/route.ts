import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const origin = url.origin
  if (!code) return NextResponse.redirect(`${origin}/participant/login?google_error=missing_code`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey) return NextResponse.redirect(`${origin}/participant/login?google_error=not_configured`)

  try {
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ auth_code: code }),
      cache: "no-store",
    })
    const token = await tokenResponse.json()
    if (!tokenResponse.ok || !token.access_token) throw new Error("OAuth exchange failed")

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    })
    const user = await userResponse.json()
    const email = typeof user.email === "string" ? user.email.toLowerCase() : ""
    if (!email) throw new Error("Google account has no email")

    const participant = await queryOne<{ id: string }>("SELECT id FROM participants WHERE LOWER(email) = $1 LIMIT 1", [email])
    if (!participant) return NextResponse.redirect(`${origin}/participant/login?google_error=account_not_found`)

    const response = NextResponse.redirect(`${origin}/participant/login?google=1`)
    response.cookies.set("participant_google_email", email, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 300, path: "/" })
    return response
  } catch {
    return NextResponse.redirect(`${origin}/participant/login?google_error=oauth_failed`)
  }
}
