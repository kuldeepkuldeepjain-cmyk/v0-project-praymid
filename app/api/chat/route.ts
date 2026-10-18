import { streamText, tool, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { getPool } from "@/lib/db"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, userEmail }: { messages: UIMessage[]; userEmail?: string } = await req.json()
  const db = getPool()!

  const systemPrompt = `You are EliteFund AI, the in-app assistant for the EliteFund Trading Terminal.

Your job is to help participants understand the terminal and their own account using simple, accurate language. Explain markets, demo trading, account verification, funding, withdrawals, security, fees, policies, and support. Never promise profits or imply trading is risk-free. Do not invent prices, balances, approvals, policies, or business credentials. If live data is unavailable, say so clearly. Encourage users to review risk before trading and to use demo mode first. When asked for trade guidance, teach a repeatable process: define the market and timeframe, identify a thesis and invalidation level, size conservatively, set a stop before entry, and review the outcome. Provide education and scenario planning only; never issue personalized buy/sell commands or guarantee outcomes.

EliteFund knowledge base:
- EliteFund is a participant-focused trading and account platform. The participant dashboard includes account overview, funding and payout workflows, notifications, leaderboard/rank information, support, an AI coach, and the Trading Terminal.
- The Trading Terminal provides live instrument quotes when the market data feed is available, chart views and timeframes, watchlist/market panels, order entry, market/limit/stop workflows, lot and margin calculations, stop-loss/take-profit planning, position management, risk analytics, alerts, journal/performance views, and execution/feed status.
- Funded-account rules currently enforced by the terminal include a minimum $3,000 order/margin requirement. The terminal calculates the minimum lot size for the selected instrument from live price, contract size, and leverage, and prevents orders below the requirement. If live quote data is unavailable or stale, the assistant must not estimate an executable price.
- Platform workflows can include account verification, deposits/funding submissions, payout requests, transaction history, rank/referrals, and support escalation. Policies, fees, approval times, eligibility, and balances are authoritative only when returned by a live tool or clearly shown in the platform; otherwise say that the participant should check the relevant page or contact support.
- The AI assistant can explain platform navigation, trading concepts, order mechanics, risk controls, and account workflows. It cannot execute trades, change balances, approve payouts, bypass verification, or provide guaranteed/personalized investment advice.

You can use the real-time tools below. Only discuss account data returned for the signed-in participant. Never reveal another participant's information. When a user asks about their balance, transactions, or active predictions, use the matching tool rather than guessing. If a live tool errors or returns no data, explain the limitation and give the correct next place to check. Be concise, professional, and transparent.`

  const signedInEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : ""
  const getAuthorizedEmail = (email: string) => {
    const requestedEmail = email.trim().toLowerCase()
    return signedInEmail && requestedEmail === signedInEmail ? requestedEmail : null
  }

  const result = streamText({
    model: "openai/gpt-5.4-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 800,
    temperature: 0.7,
    tools: {
      getPlatformStats: tool({
        description: "Get real-time platform statistics",
        inputSchema: z.object({}),
        execute: async () => {
          const [r1, r2, r3, r4, r5] = await Promise.all([
            db.query("SELECT COUNT(*) FROM participants"),
            db.query("SELECT COUNT(*) FROM participants WHERE is_active = true"),
            db.query("SELECT COUNT(*) FROM payout_requests WHERE status = 'pending'"),
            db.query("SELECT COUNT(*) FROM payment_submissions WHERE status = 'pending'"),
            db.query("SELECT COUNT(*) FROM predictions WHERE status = 'pending'"),
          ])
          return {
            totalParticipants: Number(r1.rows[0]?.count || 0),
            activeUsers: Number(r2.rows[0]?.count || 0),
            pendingPayouts: Number(r3.rows[0]?.count || 0),
            pendingPayments: Number(r4.rows[0]?.count || 0),
            activePredictions: Number(r5.rows[0]?.count || 0),
          }
        }
      }),
      getTopContributors: tool({
        description: "Get the top contributors on the leaderboard",
        inputSchema: z.object({ limit: z.number().default(5) }),
        execute: async ({ limit }) => {
          const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 10)
          const { rows } = await db.query(
            "SELECT username, total_earnings, rank, total_referrals FROM participants ORDER BY total_earnings DESC LIMIT $1",
            [safeLimit]
          )
          return {
            topContributors: rows.map((p: any, idx: number) => ({
              position: idx + 1,
              username: p.username,
              earnings: `$${Number(p.total_earnings || 0).toFixed(2)}`,
              rank: p.rank || "Bronze",
              referrals: p.total_referrals || 0,
            }))
          }
        }
      }),
      checkUserBalance: tool({
        description: "Check a user's account balance and earnings",
        inputSchema: z.object({ email: z.string().email() }),
        execute: async ({ email }) => {
          const authorizedEmail = getAuthorizedEmail(email)
          if (!authorizedEmail) return { error: "You can only view your own account data." }
          const { rows } = await db.query(
            "SELECT account_balance, bonus_balance, total_earnings, rank, total_referrals FROM participants WHERE LOWER(email) = $1",
            [authorizedEmail]
          )
          const data = rows[0]
          if (!data) return { error: "User not found or unauthorized" }
          return {
            accountBalance: `$${Number(data.account_balance || 0).toFixed(2)}`,
            bonusBalance: `$${Number(data.bonus_balance || 0).toFixed(2)}`,
            totalEarnings: `$${Number(data.total_earnings || 0).toFixed(2)}`,
            rank: data.rank || "Bronze",
            totalReferrals: data.total_referrals || 0,
          }
        }
      }),
      getRecentTransactions: tool({
        description: "Get recent transaction history for a user",
        inputSchema: z.object({ email: z.string().email(), limit: z.number().default(5) }),
        execute: async ({ email, limit }) => {
          const authorizedEmail = getAuthorizedEmail(email)
          if (!authorizedEmail) return { error: "You can only view your own account data." }
          const { rows } = await db.query(
            "SELECT type, amount, status, description, created_at FROM transactions WHERE LOWER(participant_email) = $1 ORDER BY created_at DESC LIMIT $2",
            [authorizedEmail, Math.min(Math.max(Math.floor(limit), 1), 20)]
          )
          return {
            transactions: rows.map((t: any) => ({
              type: t.type,
              amount: `$${Number(t.amount || 0).toFixed(2)}`,
              status: t.status,
              description: t.description,
              date: new Date(t.created_at).toLocaleDateString(),
            }))
          }
        }
      }),
      getActivePredictions: tool({
        description: "Get active prediction trades for a user",
        inputSchema: z.object({ email: z.string().email() }),
        execute: async ({ email }) => {
          const authorizedEmail = getAuthorizedEmail(email)
          if (!authorizedEmail) return { error: "You can only view your own account data." }
          const { rows } = await db.query(
            "SELECT crypto_pair, prediction_type, amount, entry_price, status, created_at FROM predictions WHERE LOWER(participant_email) = $1 AND status = 'pending' ORDER BY created_at DESC",
            [authorizedEmail]
          )
          return {
            activePredictions: rows.map((p: any) => ({
              pair: p.crypto_pair,
              direction: p.prediction_type === "up" ? "LONG" : "SHORT",
              amount: `$${Number(p.amount || 0).toFixed(2)}`,
              entryPrice: `$${Number(p.entry_price || 0).toLocaleString()}`,
              timeRemaining: Math.max(0, 60 - Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000)) + "s",
            }))
          }
        }
      }),
    }
  })

  return result.toUIMessageStreamResponse()
}
