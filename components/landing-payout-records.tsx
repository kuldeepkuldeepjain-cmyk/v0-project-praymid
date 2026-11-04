import Link from "next/link"
import { ArrowRight, LockKeyhole } from "lucide-react"
import { getLandingActivity } from "@/lib/landing-activity"

const usdt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const utcDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

export async function LandingPayoutRecords() {
  const activity = await getLandingActivity()
  const hasTrades = activity !== null && activity.gains.count + activity.losses.count > 0
  const hasPayouts = activity !== null && activity.payouts.count > 0

  return (
    <section id="payout-records" aria-labelledby="payout-preview-title" className="elite-section elite-section-alt elite-section-divider">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="elite-eyebrow">From the account ledger</p>
            <h2 id="payout-preview-title" className="elite-heading mt-4 text-balance">Real records. Both sides of the trade.</h2>
            <p className="elite-copy mt-4">Recorded trade outcomes and completed crypto payout requests, shown in USDT without exposing anyone&apos;s account.</p>
          </div>
          <Link href="/participant/register" className="elite-inline-link shrink-0">
            Explore accounts <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col gap-4">
            <article className="elite-sample-outcome">
              <span className="elite-eyebrow">Settled trade gains</span>
              {hasTrades ? (
                <>
                  <p className="elite-sample-amount mt-3 font-mono">+{usdt.format(activity.gains.amount)} <span className="text-base font-semibold tracking-normal">USDT</span></p>
                  <p className="elite-copy mt-3 text-sm">Total positive P&amp;L across {activity.gains.count} settled wallet-balance {activity.gains.count === 1 ? "trade" : "trades"}.</p>
                </>
              ) : (
                <p className="elite-copy mt-5 text-sm">{activity ? "No settled trade outcomes yet." : "Ledger activity is temporarily unavailable."}</p>
              )}
            </article>
            <article className="elite-sample-outcome">
              <span className="elite-eyebrow">Settled trade losses</span>
              {hasTrades ? (
                <>
                  <p className="elite-sample-amount mt-3 font-mono">−{usdt.format(activity.losses.amount)} <span className="text-base font-semibold tracking-normal">USDT</span></p>
                  <p className="elite-copy mt-3 text-sm">Total negative P&amp;L across {activity.losses.count} settled wallet-balance {activity.losses.count === 1 ? "trade" : "trades"}. Losses are part of trading.</p>
                </>
              ) : (
                <p className="elite-copy mt-5 text-sm">{activity ? "No settled trade outcomes yet." : "Ledger activity is temporarily unavailable."}</p>
              )}
            </article>
          </div>

          <div className="elite-payout-ledger flex flex-col" role="group" aria-label="Aggregate completed crypto payout records">
            <p className="elite-eyebrow">Recorded payouts</p>
            <h3 className="mt-2 text-xl font-semibold">Completed USDT payout requests</h3>
            {hasPayouts ? (
              <>
                <p className="elite-sample-amount mt-8 font-mono">{usdt.format(activity.payouts.amount)} <span className="text-base font-semibold tracking-normal">USDT</span></p>
                <p className="elite-copy mt-3 text-sm">Total across completed crypto payout records with a transfer reference on file.</p>
                <dl className="elite-payout-record-fields">
                  <div><dt>Completed requests</dt><dd className="font-mono">{activity.payouts.count}</dd></div>
                  <div><dt>Network</dt><dd>USDT · {activity.payouts.networks}</dd></div>
                  <div><dt>Latest recorded completion</dt><dd>{activity.payouts.latest ? utcDate.format(activity.payouts.latest) : "Not available"}</dd></div>
                </dl>
              </>
            ) : (
              <p className="elite-copy mt-8 text-sm">{activity ? "No completed crypto payouts with a transfer reference are recorded yet." : "Payout records are temporarily unavailable."}</p>
            )}
            <p className="elite-payout-ledger-note mt-auto flex items-start gap-2 pt-5">
              <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
              Aggregates come from account records, not independent on-chain verification. Individual trade and payout histories stay private. Past results do not guarantee future outcomes.
            </p>
            <Link href="/participant/login" className="elite-inline-link mt-5">
              Sign in to view your own records <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
