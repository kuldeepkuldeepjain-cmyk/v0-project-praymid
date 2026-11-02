import { isIP } from "node:net"
import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0" }

type IpWhoIsResponse = {
  success?: boolean
  city?: string | null
  region?: string | null
  country?: string | null
  connection?: {
    isp?: string | null
    org?: string | null
    asn?: string | number | null
  }
}

function isPublicIpv4(ip: string) {
  const [first, second, third] = ip.split(".").map(Number)

  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  )
}

function isPublicIp(ip: string) {
  const version = isIP(ip)
  if (version === 4) return isPublicIpv4(ip)
  if (version !== 6) return false

  const normalized = ip.toLowerCase()
  const firstSegment = Number.parseInt(normalized.split(":")[0] || "0", 16)

  return (
    normalized !== "::" &&
    normalized !== "::1" &&
    !normalized.startsWith("::ffff:") &&
    !normalized.startsWith("2001:db8:") &&
    firstSegment >= 0x2000 &&
    firstSegment <= 0x3fff
  )
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) || null : null
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  const ip = request.nextUrl.searchParams.get("ip")?.trim()
  if (!ip || !isPublicIp(ip)) {
    return NextResponse.json({ success: true, data: null }, { status: 200, headers: responseHeaders })
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    })

    if (!response.ok) {
      return NextResponse.json({ success: false, error: "IP lookup is temporarily unavailable" }, { status: 502, headers: responseHeaders })
    }

    const result = (await response.json()) as IpWhoIsResponse
    if (!result.success) {
      return NextResponse.json({ success: true, data: null }, { status: 200, headers: responseHeaders })
    }

    const asn = result.connection?.asn
    return NextResponse.json(
      {
        success: true,
        data: {
          city: cleanText(result.city),
          region: cleanText(result.region),
          country: cleanText(result.country),
          isp: cleanText(result.connection?.isp),
          organization: cleanText(result.connection?.org),
          asn: asn == null ? null : `AS${String(asn).replace(/^AS/i, "")}`,
        },
      },
      { status: 200, headers: responseHeaders },
    )
  } catch {
    return NextResponse.json({ success: false, error: "IP lookup is temporarily unavailable" }, { status: 502, headers: responseHeaders })
  }
}
