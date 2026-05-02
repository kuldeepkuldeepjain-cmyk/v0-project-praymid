import { streamText, tool, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { sql } from "@/lib/db"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, userEmail }: { messages: UIMessage[]; userEmail?: string } = await req.json()

  const systemPrompt = `You are FlowChain AI Assistant, an advanced intelligent assistant for the FlowChain platform.

FlowChain Platform Overview:
- Contribution & Earnings platform with gamification elements
- Users contribute funds and earn rewards through participation
- Progress through ranks: Bronze → Silver → Gold → Platinum → Diamond
- $100 activation fee required within 7 days of registration

Core Features:
1. Contributions: Crypto (USDT BEP20) or Bank Transfer payments
2. Withdrawals: Request payouts to wallet addresses (requires gas fee approval)
3. Predictions: Trade crypto price movements (BTC, ETH, BNB, etc.) with 1-minute settlements
4. Luck Wheel: Spin to win rewards (costs $5, prizes: $1-$100)
5. Leaderboard: Track top contributors and earn rank badges

Ranks & Benefits:
- Bronze: Entry level (0-499 contributions)
- Silver: 500-999 contributions
- Gold: 1,000-2,499 contributions  
- Platinum: 2,500-4,999 contributions
- Diamond: 5,000+ contributions (Elite status)

Gas Fee System:
- 100 USDT gas approval required before first withdrawal
- One-time payment to cover blockchain transaction costs
- Processed by admin within 24 hours

Prediction Trading:
- 60-second trades on crypto pairs
- Long (UP) or Short (DOWN) positions
- 1.9x payout multiplier on wins
- Real-time price tracking with live charts

Support & Help:
- Submit tickets via dashboard
- Response within 24 hours
- Categories: Technical, Payment, Withdrawal, Account

You have access to real-time platform data through tools. Use them to provide accurate, personalized assistance. Be professional, helpful, and concise.`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 800,
    temperature: 0.7,
    tools: {
      getPlatformStats: tool({
        description: "Get real-time platform statistics including total participants, active users, and pending requests",
        inputSchema: z.object({}),
        execute: async () => {
          const [tp, au, pp, pm, ap] = await Promise.all([
            sql`SELECT COUNT(*) as c FROM participants`,
            sql`SELECT COUNT(*) as c FROM participants WHERE is_active = true`,
            sql`SELECT COUNT(*) as c FROM payout_requests WHERE status = 'pending'`,
            sql`SELECT COUNT(*) as c FROM payment_submissions WHERE status = 'pending'`,
            sql`SELECT COUNT(*) as c FROM predictions WHERE status = 'pending'`,
          ])
          return {
            totalParticipants: Number(tp[0]?.c || 0),
            activeUsers: Number(au[0]?.c || 0),
            pendingPayouts: Number(pp[0]?.c || 0),
            pendingPayments: Number(pm[0]?.c || 0),
            activePredictions: Number(ap[0]?.c || 0),
          }
        }
      }),

      getTopContributors: tool({
        description: "Get the top 5 contributors on the leaderboard",
        inputSchema: z.object({
          limit: z.number().default(5).describe("Number of top contributors to retrieve")
        }),
        execute: async ({ limit }) => {
          const data = await sql`SELECT username, total_earnings, rank, total_referrals FROM participants ORDER BY total_earnings DESC LIMIT ${limit}`
          return {
            topContributors: data.map((p: any, idx: number) => ({
              position: idx + 1,
              username: p.username,
              earnings: `$${Number(p.total_earnings || 0).toFixed(2)}`,
              rank: p.rank || "Bronze",
              referrals: p.total_referrals || 0,
            })),
          }
        }
      }),

      checkUserBalance: tool({
        description: "Check a user's account balance and earnings (requires user email)",
        inputSchema: z.object({
          email: z.string().email().describe("User's email address")
        }),
        execute: async ({ email }) => {
          const rows = await sql`SELECT account_balance, bonus_balance, total_earnings, rank, total_referrals FROM participants WHERE email = ${email} LIMIT 1`
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
        inputSchema: z.object({
          email: z.string().email().describe("User's email address"),
          limit: z.number().default(5).describe("Number of transactions to retrieve")
        }),
        execute: async ({ email, limit }) => {
          const data = await sql`SELECT type, amount, status, description, created_at FROM transactions WHERE participant_email = ${email} ORDER BY created_at DESC LIMIT ${limit}`
          return {
            transactions: data.map((t: any) => ({
              type: t.type,
              amount: `$${Number(t.amount || 0).toFixed(2)}`,
              status: t.status,
              description: t.description,
              date: new Date(t.created_at).toLocaleDateString(),
            })),
          }
        }
      }),

      getActivePredictions: tool({
        description: "Get active prediction trades for a user",
        inputSchema: z.object({
          email: z.string().email().describe("User's email address")
        }),
        execute: async ({ email }) => {
          const data = await sql`SELECT crypto_pair, prediction_type, amount, entry_price, status, created_at FROM predictions WHERE participant_email = ${email} AND status = 'pending' ORDER BY created_at DESC`
          return {
            activePredictions: data.map((p: any) => ({
              pair: p.crypto_pair,
              direction: p.prediction_type === "up" ? "LONG" : "SHORT",
              amount: `$${Number(p.amount || 0).toFixed(2)}`,
              entryPrice: `$${Number(p.entry_price || 0).toLocaleString()}`,
              timeRemaining: Math.max(0, 60 - Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000)) + "s",
            })),
          }
        }
      })
    }
  })

  return result.toUIMessageStreamResponse()
}
