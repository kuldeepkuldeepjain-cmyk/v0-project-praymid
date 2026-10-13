import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Google login is not configured" }, { status: 503 })

  const requestUrl = new URL(request.url)
  const redirectTo = `${requestUrl.origin}/api/auth/google/callback`
  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`)
  authorizeUrl.searchParams.set("provider", "google")
  authorizeUrl.searchParams.set("redirect_to", redirectTo)
  authorizeUrl.searchParams.set("apikey", anonKey)
  return NextResponse.redirect(authorizeUrl)
}
