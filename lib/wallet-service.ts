import { query, execute } from "@/lib/db"

export type TransactionType =
  | "spin_win"
  | "spin_loss"
  | "spin_cost"
  | "prediction_win"
  | "prediction_loss"
  | "prediction_bet"
  | "contribution"
  | "payout_charge"
  | "payout_request"
  | "referral_bonus"
  | "contact_sync_bonus"
  | "admin_adjustment"
  | "credit"

interface WalletTransaction {
  type: TransactionType
  amount: number
  description: string
  reference_id?: string
}

export class WalletService {
  async updateWallet(
    participantId: string,
    participantEmail: string,
    transaction: WalletTransaction
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      const rows = await query(
        "SELECT account_balance FROM participants WHERE id = $1",
        [participantId]
      ) as any[]

      if (!rows || rows.length === 0) {
        return { success: false, newBalance: 0, error: "Participant not found" }
      }

      const currentBalance = Number(rows[0].account_balance) || 0
      const newBalance = currentBalance + transaction.amount

      if (newBalance < 0 && transaction.type !== "admin_adjustment") {
        return { success: false, newBalance: currentBalance, error: "Insufficient balance" }
      }

      await execute(
        "UPDATE participants SET account_balance = $1 WHERE id = $2",
        [newBalance, participantId]
      )

      await execute(
        `INSERT INTO transactions
           (participant_email, type, amount, description, reference_id, balance_before, balance_after, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'completed')`,
        [
          participantEmail,
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.reference_id || null,
          currentBalance,
          newBalance,
        ]
      ).catch(() => {})

      return { success: true, newBalance }
    } catch (error) {
      return { success: false, newBalance: 0, error: "Unexpected error" }
    }
  }

  async getTransactions(participantEmail: string, limit = 50) {
    try {
      const rows = await query(
        "SELECT * FROM transactions WHERE participant_email = $1 ORDER BY created_at DESC LIMIT $2",
        [participantEmail, limit]
      ) as any[]
      return rows || []
    } catch {
      return []
    }
  }

  async getBalance(participantId: string): Promise<number> {
    try {
      const rows = await query(
        "SELECT account_balance FROM participants WHERE id = $1",
        [participantId]
      ) as any[]
      return Number(rows?.[0]?.account_balance) || 0
    } catch {
      return 0
    }
  }
}

export const walletService = new WalletService()
