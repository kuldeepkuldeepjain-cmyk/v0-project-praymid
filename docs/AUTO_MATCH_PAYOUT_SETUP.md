/**
 * CRON JOB SETUP: Auto-Match Payout with Contribution Requests
 * 
 * This endpoint automatically matches pending payouts with approved contributions
 * if no admin has manually matched them within 30 minutes. Uses FIFO (first-come-first-served).
 * 
 * ENDPOINT: /api/admin/auto-match-payout-contribution
 * METHOD: POST
 * 
 * SETUP OPTIONS:
 * 
 * 1. Using Vercel Crons (Recommended for Next.js)
 * ================================================
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/admin/auto-match-payout-contribution",
 *     "schedule": "*/5 * * * *"  // Every 5 minutes
 *   }]
 * }
 * 
 * Add header authorization via Vercel environment variable:
 * CRON_SECRET=your-secret-key
 * 
 * Vercel will automatically add the "x-vercel-cron" header
 * 
 * ---
 * 
 * 2. Using External Cron Service (e.g., EasyCron, cron-job.org)
 * ============================================================
 * URL: https://yourdomain.com/api/admin/auto-match-payout-contribution
 * Method: POST
 * Headers: 
 *   - Authorization: Bearer {CRON_SECRET}
 *   - Content-Type: application/json
 * Body: {} (empty)
 * Schedule: Every 5 minutes (*/5 * * * *)
 * 
 * ---
 * 
 * 3. Using GitHub Actions (Free Alternative)
 * ==========================================
 * Create .github/workflows/auto-match-payout.yml:
 * 
 * name: Auto-Match Payout Contribution
 * on:
 *   schedule:
 *     - cron: '*/5 * * * *'  # Every 5 minutes
 * 
 * jobs:
 *   auto-match:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - name: Trigger auto-match
 *         run: |
 *           curl -X POST https://yourdomain.com/api/admin/auto-match-payout-contribution \
 *             -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
 *             -H "Content-Type: application/json" \
 *             -d '{}'
 * 
 * ---
 * 
 * FLOW DIAGRAM:
 * =============
 * 1. API Receives Request
 *    ↓
 * 2. Query approved contributions NOT matched AND reviewed > 30 min ago (FIFO order)
 *    ↓
 * 3. For each contribution:
 *    - Find oldest pending payout for same participant (FIFO)
 *    - Link contribution.matched_payout_id = payout.id
 *    - Link payout.matched_contribution_id = contribution.id
 *    - Send notification to participant
 *    - Log the auto-match action
 *    ↓
 * 4. Return results with match count
 * 
 * ---
 * 
 * IMPORTANT NOTES:
 * ===============
 * - Only matches if contribution was reviewed > 30 minutes ago (not manually matched)
 * - Uses FIFO (First-In-First-Out) for fair matching
 * - Only matches "approved" contributions with "pending" payouts
 * - Runs every 5 minutes to catch all eligible matches
 * - Non-blocking: If a match fails, continues with next contribution
 * - Creates notifications and activity logs for audit trail
 * 
 * ---
 * 
 * SECURITY:
 * =========
 * - Requires CRON_SECRET environment variable in authorization header
 * - Set CRON_SECRET to a strong, unique value
 * - Store securely in .env.local (local) or Vercel Secrets (production)
 */
