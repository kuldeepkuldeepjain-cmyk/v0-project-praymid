import { Client } from "@upstash/qstash"

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
})

/**
 * Schedule auto-matching of a contribution 30 minutes after submission
 * Uses Upstash QStash for delayed callback
 */
export async function scheduleContributionAutoMatch(
  contributionId: string,
  participantEmail: string,
  delaySeconds: number = 1800 // 30 minutes
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    
    console.log(`[v0] Scheduling auto-match for contribution ${contributionId} in ${delaySeconds}s`)

    const response = await qstash.publish({
      url: `${baseUrl}/api/admin/auto-match-single-contribution`,
      body: {
        contributionId,
        participantEmail,
        delayedAt: new Date().toISOString(),
      },
      delay: delaySeconds,
      retries: 3,
    })

    console.log("[v0] Contribution auto-match scheduled:", response)
    return { success: true, messageId: response.messageId }
  } catch (error) {
    console.error("[v0] Error scheduling auto-match:", error)
    // Don't throw - allow contribution to proceed even if scheduling fails
    // Admin can still manually match if needed
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Cancel a scheduled auto-match (if contribution is manually matched earlier)
 */
export async function cancelContributionAutoMatch(messageId: string) {
  try {
    if (!messageId) return { success: true, message: "No message ID to cancel" }
    
    console.log("[v0] Canceling auto-match message:", messageId)
    
    await qstash.messages.delete(messageId)
    
    console.log("[v0] Auto-match canceled successfully")
    return { success: true }
  } catch (error) {
    console.warn("[v0] Error canceling auto-match (may not exist):", error)
    // Don't throw - it's okay if message doesn't exist
    return { success: true, message: "Message not found or already executed" }
  }
}
