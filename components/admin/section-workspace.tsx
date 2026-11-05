"use client"

import { useState, type ReactNode } from "react"

const guides: Record<string, { summary: string; tips: string[] }> = {
  overview: { summary: "Monitor platform activity and use the dedicated sections to investigate individual records.", tips: ["Check the date range and data scope before comparing totals.", "Use Participants for account details and Revenue Tracker for financial breakdowns."] },
  "trading-terminal": { summary: "Review trading operations and manage the existing terminal controls.", tips: ["Check the selected account and instrument before changing settings.", "Review the impact of a control before confirming an action."] },
  participants: { summary: "Find participant accounts, review their details, and access existing account actions.", tips: ["Combine search with status, rank, activation, and account-type filters.", "Clear filters to return to the full list. Scroll tables horizontally for additional columns."] },
  "revenue-tracker": { summary: "Review platform revenue and understand the scope of each financial total.", tips: ["Check the selected reporting period before comparing figures.", "Use ledger records to investigate individual transactions."] },
  "all-payouts": { summary: "Find payout records and review their status, destination, and balance history.", tips: ["Filter by status and search loaded records by participant, reference, or wallet.", "Verify the destination and amount before processing, completing, or rejecting a payout. Export keeps its existing status-filtered scope."] },
  "all-ledger": { summary: "Trace participant transactions using the existing type, email, and date-order controls.", tips: ["Export downloads the current page of records, not the entire ledger.", "Clear All affects all ledger records, not just the visible filtered page."] },
  "user-ledger": { summary: "Investigate the transaction history of one participant.", tips: ["Verify the participant email before reviewing their records.", "Check transaction types, dates, and balances together when investigating a discrepancy."] },
  "support-tickets": { summary: "Review participant support requests and continue existing ticket conversations.", tips: ["Check the ticket status and participant identity before replying.", "Read the conversation history to avoid asking for information already provided."] },
  "otp-approvals": { summary: "Review verification requests before using the existing approval actions.", tips: ["Confirm the requester and purpose before approving.", "Refresh the queue if a request has already been handled by another administrator."] },
  "suspicious-activity": { summary: "Triage flagged activity and inspect the evidence behind each alert.", tips: ["Risk scores are review signals, not proof of fraud.", "Review supporting activity before taking any account action."] },
  "security-operations": { summary: "Review security signals and manage existing operational controls.", tips: ["Verify the affected participant and evidence before applying restrictions.", "Use the available filters to focus the review without changing account state."] },
  "trader-behaviour": { summary: "Explore trading patterns and identify records that need closer review.", tips: ["Consider the sample size and reporting period when reading analytics.", "Investigate unusual patterns before drawing conclusions about an account."] },
  "participant-management": { summary: "Manage participant accounts using the existing account controls.", tips: ["Find and verify the correct participant before making changes.", "Read each confirmation carefully; account actions may affect access or balances."] },
  database: { summary: "Browse the existing database views and locate participant records.", tips: ["Use the controls in each view to narrow the results.", "Scroll wide tables horizontally to inspect all available fields."] },
  "topup-requests": { summary: "Review deposit evidence and manage participant top-up requests.", tips: ["Pending includes requests awaiting collection. Use payment-method filtering to narrow the queue.", "Deposit address settings affect the participant payment flow; verify the network before saving."] },
  "promo-codes": { summary: "Review and manage the existing promotional offers.", tips: ["Check the code terms, validity, and usage restrictions before saving.", "Confirm which offer you are editing before changing its availability."] },
  "delete-participants": { summary: "Carefully identify participant records before using deletion controls.", tips: ["Verify each selected participant and review the confirmation before proceeding.", "Deletion is destructive. A search filter is not a substitute for reviewing the selected records."] },
  "two-factor-auth": { summary: "Manage the additional verification protecting your admin account.", tips: ["Follow the existing setup steps and verify the code before completing setup.", "Keep any recovery information private and securely stored."] },
  "send-notifications": { summary: "Compose, preview, and send participant email using the existing delivery flow.", tips: ["Review the audience and preview before confirming a send.", "Keep the panel open while batches are sending. Provider acceptance does not guarantee inbox delivery."] },
}

export function SectionWorkspace({ section, children }: { section: string; children: ReactNode }) {
  const [compact, setCompact] = useState(false)
  const guide = guides[section]
  return (
    <section className="admin-section flex min-w-0 flex-col gap-5" data-density={compact ? "compact" : "comfortable"}>
      {guide && <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-3xl text-pretty text-sm leading-6">{guide.summary}</p>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={compact} onChange={event => setCompact(event.target.checked)} className="size-4 accent-primary" />Compact tables</label>
        </div>
        <details className="mt-3 text-sm leading-6">
          <summary className="w-fit cursor-pointer rounded-sm text-primary focus-visible:outline-2 focus-visible:outline-offset-4">Section guide</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">{guide.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
        </details>
      </div>}
      <div className="admin-section-content min-w-0">{children}</div>
    </section>
  )
}
