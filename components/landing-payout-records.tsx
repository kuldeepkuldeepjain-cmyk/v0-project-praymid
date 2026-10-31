import Link from "next/link"
import { ArrowRight, LockKeyhole, ReceiptText } from "lucide-react"

const payoutRecordFields = [
  { label: "Request", value: "Amount and submission date" },
  { label: "Status", value: "Current review stage" },
  { label: "Payment", value: "Method and available transaction reference" },
]

export function LandingPayoutRecords() {
  return (
    <section id="payout-records" className="elite-section elite-section-alt elite-section-divider">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
        <div className="max-w-xl">
          <p className="elite-eyebrow">Private payout history</p>
          <h2 className="elite-heading mt-4 text-balance">A clear record for every payout request.</h2>
          <p className="elite-copy mt-5">
            Review your request amount, status, payment method, and transaction reference when available in your account dashboard.
          </p>
          <p className="elite-copy mt-3 text-sm">
            Personal payout activity stays private to your account. Eligibility, review, and timing depend on the applicable terms.
          </p>
          <Link href="/participant/login" className="elite-inline-link mt-7">
            Sign in to view payout records <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="elite-payout-ledger" role="group" aria-label="Details available in private payout history">
          <div className="elite-payout-ledger-heading">
            <div className="elite-feature-icon"><ReceiptText aria-hidden="true" /></div>
            <div>
              <p className="elite-eyebrow">Account history</p>
              <h3 className="mt-1 text-xl font-semibold">Payout record details</h3>
            </div>
            <LockKeyhole className="elite-brand-text ml-auto size-5" aria-hidden="true" />
          </div>

          <dl className="elite-payout-record-fields">
            {payoutRecordFields.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <p className="elite-payout-ledger-note">
            This preview describes the fields available in account history. It does not display sample transactions or unverified payout claims.
          </p>
        </div>
      </div>
    </section>
  )
}
