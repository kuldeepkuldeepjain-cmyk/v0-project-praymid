import { createClient } from "@/lib/supabase/client"

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
  private supabase = createClient()

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
      const { data: participant, error: fetchError } = await this.supabase
        .from("participants")
        .select("account_balance")
        .eq("id", participantId)
        .single()

      if (fetchError || !participant) {
        console.error("[v0] Error fetching participant:", fetchError)
        return { success: false, newBalance: 0, error: "Failed to fetch participant data" }
      }

      const currentBalance = participant.account_balance || 0
      const newBalance = currentBalance + transaction.amount

      // Prevent negative balance (except for admin adjustments)
      if (newBalance < 0 && transaction.type !== "admin_adjustment") {
        return { success: false, newBalance: currentBalance, error: "Insufficient balance" }
      }

      console.log("[v0] Updating wallet:", {
        currentBalance,
        transaction: transaction.amount,
        newBalance,
      })

      // Update participant balance
      const { error: updateError } = await this.supabase
        .from("participants")
        .update({ account_balance: newBalance })
        .eq("id", participantId)

      if (updateError) {
        console.error("[v0] Error updating balance:", updateError)
        return { success: false, newBalance: currentBalance, error: "Failed to update balance" }
      }

      // Create transaction record
      const { error: transactionError } = await this.supabase.from("transactions").insert({
        participant_email: participantEmail,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        reference_id: transaction.reference_id || null,
        balance_before: currentBalance,
        balance_after: newBalance,
      })

      if (transactionError) {
        console.error("[v0] Error creating transaction:", transactionError)
        // Balance updated but transaction log failed - this is acceptable
      }

      console.log("[v0] Wallet updated successfully:", newBalance)
      return { success: true, newBalance }
    } catch (error) {
      console.error("[v0] Wallet service error:", error)
      return { success: false, newBalance: 0, error: "Unexpected error" }
    }
  }

  /**
   * Get transaction history for participant
   */
  async getTransactions(participantId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("participant_email", participantId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching transactions:", error)
      return []
    }

    return data || []
  }

  /**
   * Get current wallet balance
   */
  async getBalance(participantId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("participants")
      .select("account_balance")
      .eq("id", participantId)
      .single()

    if (error || !data) {
      console.error("[v0] Error fetching balance:", error)
      return 0
    }

    return data.account_balance || 0
  }
}

// Singleton instance
export const walletService = new WalletService()
