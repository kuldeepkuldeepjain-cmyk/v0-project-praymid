import { NextRequest, NextResponse } from "next/server"
import { execute, query } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

type Signal = {
  id: string
  type: string
  severity: "low" | "medium" | "high"
  score: number
  title: string
  summary: string
  traders: string[]
  evidence: string[]
  detectedAt: string
  status: "open" | "reviewed"
}

const detectionRules = [
  ["shared_ip", "Same IP used by multiple traders", "Network identity"],
  ["shared_device", "Same device used by multiple traders", "Device fingerprint"],
  ["simultaneous", "Multiple accounts trading simultaneously", "Session overlap"],
  ["identical_trades", "Identical trades", "Trade correlation"],
  ["entry_exit", "Same entry / exit patterns", "Trade correlation"],
  ["copy_trading", "Copy trading", "Trade correlation"],
  ["opposite_matching", "Opposite-position matching", "Trade correlation"],
  ["account_sharing", "Account sharing", "Identity"],
  ["lot_increase", "Abnormal lot increase", "Behaviour"],
  ["frequency", "Abnormal trading frequency", "Behaviour"],
  ["ea_signature", "EA signature", "Execution"],
  ["arbitrage", "Arbitrage pattern", "Execution"],
  ["latency_arbitrage", "Latency arbitrage", "Execution"],
  ["price_feed", "Price-feed exploitation", "Execution"],
] as const

function severityFor(score: number): Signal["severity"] {
  return score >= 80 ? "high" : score >= 50 ? "medium" : "low"
}

function signalFromGroup(row: any, type: string, title: string, score: number, valueLabel: string): Signal {
  const traders = String(row.traders || "").split(",").filter(Boolean)
  return {
    id: `${type}-${String(row.signal_key)}`,
    type,
    severity: severityFor(score),
    score,
    title,
    summary: `${row.trader_count} trader accounts share the same ${valueLabel}.`,
    traders,
    evidence: [`${valueLabel}: ${row.signal_key}`, `${row.event_count} recorded events`, `Window: last 30 days`],
    detectedAt: new Date().toISOString(),
    status: "open",
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  const signals: Signal[] = []
  try {
    const sharedIps = await query(
      `SELECT ip_address::text AS signal_key, COUNT(DISTINCT actor_id)::int AS trader_count,
        STRING_AGG(DISTINCT COALESCE(actor_email, actor_id::text), ', ' ORDER BY COALESCE(actor_email, actor_id::text)) AS traders,
        COUNT(*)::int AS event_count
       FROM activity_logs
       WHERE ip_address IS NOT NULL AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY ip_address HAVING COUNT(DISTINCT actor_id) > 1
       ORDER BY trader_count DESC LIMIT 25`,
    )
    sharedIps.forEach((row: any) => signals.push(signalFromGroup(row, "shared_ip", "Shared IP identity", 72, "IP address")))
  } catch (error) {
    console.error("[suspicious-activity] shared IP query failed", error)
  }

  try {
    const sharedDevices = await query(
      `SELECT LEFT(user_agent, 180) AS signal_key, COUNT(DISTINCT actor_id)::int AS trader_count,
        STRING_AGG(DISTINCT COALESCE(actor_email, actor_id::text), ', ' ORDER BY COALESCE(actor_email, actor_id::text)) AS traders,
        COUNT(*)::int AS event_count
       FROM activity_logs
       WHERE user_agent IS NOT NULL AND user_agent <> '' AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY LEFT(user_agent, 180) HAVING COUNT(DISTINCT actor_id) > 1
       ORDER BY trader_count DESC LIMIT 25`,
    )
    sharedDevices.forEach((row: any) => signals.push(signalFromGroup(row, "shared_device", "Shared device signature", 64, "device signature")))
  } catch (error) {
    console.error("[suspicious-activity] shared device query failed", error)
  }

  try {
    const activitySignals = await query(
      `SELECT id::text, action, COALESCE(actor_email, actor_id::text, 'Unknown trader') AS trader,
        details, created_at
       FROM activity_logs
       WHERE (LOWER(action) LIKE '%trade%' OR LOWER(action) LIKE '%prediction%')
         AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC LIMIT 100`,
    )
    const simultaneous = new Map<string, { traders: Set<string>; count: number; latest: string }>()
    for (const row of activitySignals as any[]) {
      const minute = new Date(row.created_at).toISOString().slice(0, 16)
      const bucket = simultaneous.get(minute) || { traders: new Set<string>(), count: 0, latest: row.created_at }
      bucket.traders.add(row.trader)
      bucket.count += 1
      simultaneous.set(minute, bucket)
    }
    for (const [minute, bucket] of simultaneous) {
      if (bucket.traders.size < 2) continue
      signals.push({
        id: `simultaneous-${minute}`,
        type: "simultaneous",
        severity: severityFor(58),
        score: 58,
        title: "Simultaneous trading activity",
        summary: `${bucket.traders.size} accounts recorded trade activity in the same minute.`,
        traders: [...bucket.traders],
        evidence: [`${bucket.count} trade events`, `Time bucket: ${minute.replace("T", " ")} UTC`, "Requires trade-level comparison"],
        detectedAt: bucket.latest,
        status: "open",
      })
    }
  } catch (error) {
    console.error("[suspicious-activity] trade activity query failed", error)
  }

  signals.sort((a, b) => b.score - a.score || new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
  const reviewed = await query<{ details: string }>(
    `SELECT details FROM activity_logs WHERE action = 'fraud_signal_reviewed' ORDER BY created_at DESC LIMIT 200`,
  ).catch(() => [])
  const reviewedIds = new Set(reviewed.map((row) => row.details?.match(/signal_id=([^;]+)/)?.[1]).filter(Boolean))
  signals.forEach((signal) => {
    if (reviewedIds.has(signal.id)) signal.status = "reviewed"
  })

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    signals,
    rules: detectionRules.map(([id, label, category]) => ({ id, label, category, telemetry: id === "shared_ip" || id === "shared_device" || id === "simultaneous" ? "active" : "requires trade telemetry" })),
    summary: {
      open: signals.filter((signal) => signal.status === "open").length,
      high: signals.filter((signal) => signal.severity === "high" && signal.status === "open").length,
      medium: signals.filter((signal) => signal.severity === "medium" && signal.status === "open").length,
      low: signals.filter((signal) => signal.severity === "low" && signal.status === "open").length,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    if (typeof body.signalId !== "string" || !body.signalId || !["reviewed", "dismissed"].includes(body.action)) {
      return NextResponse.json({ success: false, error: "Invalid review action" }, { status: 400 })
    }
    await execute(
      `INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ($1, 'fraud_signal_reviewed', 'fraud_signal', $2)`,
      [auth.email, `signal_id=${body.signalId}; action=${body.action}; note=${String(body.note || "").slice(0, 500)}`],
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[suspicious-activity] review failed", error)
    return NextResponse.json({ success: false, error: "Could not save review" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Keep the rule catalog close to the endpoint so the UI and review audit use one source of truth.
void detectionRules
