import { sql } from "@/lib/db"

export type TransactionType =
  | "spin_win"
  | "prediction_win"
  | "prediction_loss"
  | "contribution"
  | "payout_charge"
  | "payout_request"
  | "referral_bonus"
  | "contact_sync_bonus"
  | "admin_adjustment"

interface WalletTransaction {
  type: TransactionType
  amount: number
  description: string
  reference_id?: string
}

export class WalletService {
  /**
   * Updates wallet balance and creates transaction record
   */
  async updateWallet(
    participantId: string,
    participantEmail: string,
    transaction: WalletTransaction
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      // Get current balance
      const rows = await sql`SELECT account_balance FROM participants WHERE id = ${participantId} LIMIT 1`
      const participant = rows[0]

      if (!participant) {
        return { success: false, newBalance: 0, error: "Failed to fetch participant data" }
      }

      const currentBalance = Number(participant.account_balance) || 0
      const newBalance = currentBalance + transaction.amount

      if (newBalance < 0 && transaction.type !== "admin_adjustment") {
        return { success: false, newBalance: currentBalance, error: "Insufficient balance" }
      }

      await sql`UPDATE participants SET account_balance = ${newBalance} WHERE id = ${participantId}`

      try {
        await sql`
          INSERT INTO transactions (participant_email, type, amount, description, reference_id, balance_before, balance_after)
          VALUES (${participantEmail}, ${transaction.type}, ${transaction.amount}, ${transaction.description}, ${transaction.reference_id || null}, ${currentBalance}, ${newBalance})
        `
      } catch {}

      return { success: true, newBalance }
    } catch (error) {
      console.error("Wallet service error:", error)
      return { success: false, newBalance: 0, error: "Unexpected error" }
    }
  }

  /**
   * Get transaction history for participant
   */
  async getTransactions(participantEmail: string, limit = 50) {
    try {
      const data = await sql`
        SELECT * FROM transactions
        WHERE participant_email = ${participantEmail}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      return data || []
    } catch (error) {
      console.error("Error fetching transactions:", error)
      return []
    }
  }

  async getBalance(participantId: string): Promise<number> {
    try {
      const rows = await sql`SELECT account_balance FROM participants WHERE id = ${participantId} LIMIT 1`
      const data = rows[0]
      if (!data) return 0
      return Number(data.account_balance) || 0
    } catch (error) {
      console.error("Error fetching balance:", error)
      return 0
    }
  }
}

// Singleton instance
export const walletService = new WalletService()
