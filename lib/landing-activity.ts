import "server-only"

import { and, eq, gt, inArray, isNotNull, lt, or, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { getPool } from "@/lib/db"

const settledTrades = pgTable("predictions", {
  participantId: uuid("participant_id"),
  balanceSource: text("balance_source"),
  status: text("status"),
  result: text("result"),
  profitLoss: numeric("profit_loss"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
})

const payoutRequests = pgTable("payout_requests", {
  participantId: uuid("participant_id"),
  amount: numeric("amount"),
  status: text("status"),
  payoutMethod: text("payout_method"),
  transactionHash: text("transaction_hash"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})

export type LandingActivity = {
  gains: { count: number; amount: number }
  losses: { count: number; amount: number }
  payouts: { count: number; amount: number; latest: Date | null; networks: string | null }
}

export async function getLandingActivity(): Promise<LandingActivity | null> {
  const pool = getPool()
  if (!pool) return null

  try {
    const db = drizzle(pool)
    const [trades, payouts] = await Promise.all([
      db.select({
        result: settledTrades.result,
        count: sql<number>`count(*)::integer`,
        amount: sql<string>`coalesce(sum(abs(${settledTrades.profitLoss})), 0)::text`,
      })
        .from(settledTrades)
        .where(and(
          eq(settledTrades.status, "settled"),
          eq(settledTrades.balanceSource, "wallet"),
          isNotNull(settledTrades.participantId),
          isNotNull(settledTrades.closedAt),
          or(
            and(eq(settledTrades.result, "won"), gt(settledTrades.profitLoss, "0")),
            and(eq(settledTrades.result, "lost"), lt(settledTrades.profitLoss, "0")),
          ),
        ))
        .groupBy(settledTrades.result),
      db.select({
        count: sql<number>`count(*)::integer`,
        amount: sql<string>`coalesce(sum(${payoutRequests.amount}), 0)::text`,
        latest: sql<string | null>`max(greatest(${payoutRequests.processedAt}, ${payoutRequests.updatedAt}))::text`,
        networks: sql<string | null>`string_agg(distinct ${payoutRequests.payoutMethod}, ' / ' order by ${payoutRequests.payoutMethod})`,
      })
        .from(payoutRequests)
        .where(and(
          eq(payoutRequests.status, "completed"),
          inArray(payoutRequests.payoutMethod, ["BEP20", "TRC20", "ERC20"]),
          gt(payoutRequests.amount, "0"),
          isNotNull(payoutRequests.participantId),
          isNotNull(payoutRequests.processedAt),
          isNotNull(sql`nullif(btrim(${payoutRequests.transactionHash}), '')`),
        )),
    ])

    const gains = trades.find((trade) => trade.result === "won")
    const losses = trades.find((trade) => trade.result === "lost")
    const latest = payouts[0]?.latest ? new Date(payouts[0].latest) : null
    const activity = {
      gains: { count: gains?.count ?? 0, amount: Number(gains?.amount ?? 0) },
      losses: { count: losses?.count ?? 0, amount: Number(losses?.amount ?? 0) },
      payouts: {
        count: payouts[0]?.count ?? 0,
        amount: Number(payouts[0]?.amount ?? 0),
        latest: latest && Number.isFinite(latest.getTime()) ? latest : null,
        networks: payouts[0]?.networks ?? null,
      },
    }

    if (![activity.gains.amount, activity.losses.amount, activity.payouts.amount].every(Number.isFinite)) {
      return null
    }

    return activity
  } catch (error) {
    console.error("Landing ledger activity unavailable:", error)
    return null
  }
}
