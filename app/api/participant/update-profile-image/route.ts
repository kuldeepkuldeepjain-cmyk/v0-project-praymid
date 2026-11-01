import { NextResponse } from "next/server"
import { PATCH as updateProfile } from "@/app/api/participant/me/route"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!("profile_image" in body)) return NextResponse.json({ error: "A profile photo is required" }, { status: 400 })
    return updateProfile(new Request(request.url, {
      method: "PATCH",
      headers: request.headers,
      body: JSON.stringify({ profile_image: body.profile_image }),
    }))
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
