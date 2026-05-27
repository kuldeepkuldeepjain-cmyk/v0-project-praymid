import { sql } from "@/lib/db"

/**
 * In-memory store for WebSocket connections (placeholder for future implementation)
 */
const connections: Map<string, Set<any>> = new Map()

export function registerConnection(email: string, ws: any) {
  if (!connections.has(email)) connections.set(email, new Set())
  connections.get(email)!.add(ws)

  if (ws.on) {
    ws.on("close", () => {
      connections.get(email)?.delete(ws)
      if (connections.get(email)?.size === 0) connections.delete(email)
    })
  }
}

export function broadcastToParticipant(email: string, event: string, data: any) {
  const clientConnections = connections.get(email)
  if (clientConnections && clientConnections.size > 0) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() })
    clientConnections.forEach((ws: any) => {
      if (ws.send && ws.readyState === 1) ws.send(message)
    })
  }
}

export async function processAutomatch() {
  console.log("[automatch] Starting automatch process...")
  const processStartTime = Date.now()
  const now = new Date()
  let matchedCount = 0
  let failedCount = 0
  const matchDetails: Array<{ contributionId: string; payoutId: string; amount: number }> = []

  try {
    const contributions = await sql`
      SELECT id, participant_email, participant_id, amount, status, created_at, matched_payout_id
      FROM payment_submissions
      WHERE status IN ('pending', 'request_pending')
        AND matched_payout_id IS NULL
      ORDER BY created_at ASC
      LIMIT 100
    `

    if (!contributions || contributions.length === 0) {
      return { matched: 0, failed: 0, processDuration: Date.now() - processStartTime }
    }

    const payouts = await sql`
      SELECT id, participant_email, participant_id, amount, status, created_at, matched_contribution_id
      FROM payout_requests
      WHERE status IN ('pending', 'request_pending')
        AND matched_contribution_id IS NULL
      ORDER BY created_at ASC
      LIMIT 100
    `

    if (!payouts || payouts.length === 0) {
      return { matched: 0, failed: 0, note: "No payouts available", processDuration: Date.now() - processStartTime }
    }

    const usedPayoutIds = new Set<string>()

    for (const contribution of contributions) {
      if (contribution.matched_payout_id) continue

      const payout = payouts.find(
        (p: any) => !usedPayoutIds.has(p.id) && !p.matched_contribution_id && p.amount >= contribution.amount
      )

      if (!payout) { failedCount++; continue }

      try {
        await sql`
          UPDATE payment_submissions
          SET status = 'in_process', matched_at = ${now.toISOString()}, matched_payout_id = ${payout.id}, updated_at = ${now.toISOString()}
          WHERE id = ${contribution.id} AND status IN ('pending', 'request_pending')
        `

        await sql`
          UPDATE payout_requests
          SET status = 'in_process', matched_at = ${now.toISOString()}, matched_contribution_id = ${contribution.id}
          WHERE id = ${payout.id} AND status IN ('pending', 'request_pending')
        `

        usedPayoutIds.add(payout.id)
        matchedCount++
        matchDetails.push({ contributionId: contribution.id, payoutId: payout.id, amount: contribution.amount })
      } catch (matchError) {
        failedCount++
        console.error(`[automatch] Error matching contribution ${contribution.id}:`, matchError)
      }
    }

    return {
      matched: matchedCount,
      failed: failedCount,
      details: matchDetails,
      processDuration: Date.now() - processStartTime,
      timestamp: now.toISOString(),
    }
  } catch (error) {
    console.error("[automatch] Critical error:", error)
    return { matched: matchedCount, failed: failedCount, error: String(error), processDuration: Date.now() - processStartTime }
  }
}
