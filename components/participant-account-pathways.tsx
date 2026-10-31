import Link from "next/link"
import { ArrowUpRight, Gauge, ShieldCheck, TrendingUp } from "lucide-react"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

export type ParticipantAccountType = "normal" | "challenge" | "funded"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const challengePlans = DEFAULT_CHALLENGE_PLANS
const challengeBalanceRange = [
  Math.min(...challengePlans.map((plan) => plan.startingBalance)),
  Math.max(...challengePlans.map((plan) => plan.startingBalance)),
]

const options = [
  {
    type: "normal" as const,
    title: "Normal account",
    highlight: "Up to 1,000× leverage",
    icon: TrendingUp,
  },
  {
    type: "challenge" as const,
    title: "Challenge account",
    highlight: `Plans ${currency.format(challengeBalanceRange[0])}–${currency.format(challengeBalanceRange[1])}`,
    icon: Gauge,
  },
  {
    type: "funded" as const,
    title: "Funded account",
    highlight: "$5,000–$100,000 capacity",
    icon: ShieldCheck,
  },
]

export function ParticipantAccountPathways({ accountType }: { accountType: ParticipantAccountType }) {
  const otherOptions = options.filter((option) => option.type !== accountType)

  return (
    <section className="w-full min-w-0 max-w-7xl font-sans" aria-labelledby="account-pathways-title">
      <header className="mb-2 flex items-center justify-between gap-3">
        <h2 id="account-pathways-title" className="text-lg font-semibold tracking-tight text-white">
          Other accounts
        </h2>
        <Link
          href="/participant/dashboard/accounts"
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-amber-200 transition-colors hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Compare all <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {otherOptions.map(({ type, title, highlight, icon: Icon }) => (
          <Link
            key={type}
            href={`/participant/dashboard/accounts#${type}`}
            aria-label={`View details for ${title}`}
            className="group flex min-h-[76px] min-w-0 items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/75 p-3 text-left transition-colors hover:border-amber-300/35 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[0.99]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/10 text-amber-200">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-white">{title}</span>
                <ArrowUpRight className="size-4 shrink-0 text-slate-500 transition-colors group-hover:text-amber-200" aria-hidden="true" />
              </span>
              <span className="mt-1 block truncate font-mono text-sm tabular-nums text-slate-400">{highlight}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
