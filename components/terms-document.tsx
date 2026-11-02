import Link from "next/link"

const quickLinks = [
  { href: "#section-2", label: "Eligibility" },
  { href: "#section-3", label: "Plans and fees" },
  { href: "#section-6", label: "Trading limits" },
  { href: "#section-8", label: "Payouts" },
  { href: "#section-9", label: "Refunds" },
  { href: "#section-17", label: "Complaints" },
  { href: "#section-19", label: "Applicable law" },
] as const

const keyPoints = [
  "You must be at least 18, or the higher legal age where you live.",
  "Advertised account balances are trading capacity, not cash paid to you.",
  "Challenge and funded accounts have different rules. Check your selected plan.",
  "Purchase, trading activity, or a passed evaluation does not guarantee a payout.",
]

type TermsDocumentProps = {
  sections: Array<[string, string]>
}

function TermsOverview() {
  return (
    <section
      aria-labelledby="terms-overview-heading"
      className="mt-10 rounded-2xl bg-[var(--terminal-graphite-surface)] p-6 text-[var(--terminal-graphite-text)] sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-primary)]">Read this first</p>
      <h2 id="terms-overview-heading" className="mt-2 text-xl font-semibold text-balance sm:text-2xl">
        Key points before you choose a plan
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-6 text-[var(--terminal-graphite-muted)]">
        This summary is a guide. The detailed terms and the published rules for your selected plan explain the conditions that apply.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {keyPoints.map((point) => (
          <li key={point} className="flex items-start gap-3 text-base leading-6">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TermsNavigation() {
  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <nav aria-label="Terms section navigation">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--terminal-graphite-muted)]">
          On this page
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-start lg:gap-3">
          {quickLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-block rounded-lg bg-[var(--terminal-graphite-surface)] px-3 py-2 text-sm font-medium leading-5 text-[var(--terminal-graphite-text)] transition-colors hover:text-[var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] lg:bg-transparent lg:px-0 lg:py-0"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-6 hidden text-sm leading-5 text-[var(--terminal-graphite-muted)] lg:block">
        Have a question? <a href="mailto:support@elitefund.sbs" className="text-[var(--brand-primary)] underline underline-offset-4">Email support</a>.
      </p>
    </aside>
  )
}

function TermsArticle({ sections }: TermsDocumentProps) {
  return (
    <article className="min-w-0">
      {sections.map(([title, text], index) => {
        const id = `section-${index + 1}`
        return (
          <section key={id} id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-8 border-b border-[var(--terminal-graphite-muted)]/20 py-8 first:pt-0">
            <div className="flex items-start gap-4 sm:gap-6">
              <span aria-hidden="true" className="mt-1 shrink-0 text-sm font-semibold text-[var(--brand-primary)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight text-balance text-[var(--terminal-graphite-text)]">
                  {title.replace(/^\d+\.\s*/, "")}
                </h2>
                <div className="mt-4 flex flex-col gap-4 text-base leading-6 text-pretty text-[var(--terminal-graphite-muted)]">
                  {text.split("\n\n").map((paragraph, paragraphIndex) => (
                    <p key={`${id}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
      })}
      <section id="section-20" aria-labelledby="contact-heading" className="scroll-mt-8 py-8">
        <div className="flex items-start gap-4 sm:gap-6">
          <span aria-hidden="true" className="mt-1 shrink-0 text-sm font-semibold text-[var(--brand-primary)]">20</span>
          <div className="min-w-0">
            <h2 id="contact-heading" className="text-xl font-semibold tracking-tight text-[var(--terminal-graphite-text)]">Contact information</h2>
            <p className="mt-4 text-base leading-6 text-[var(--terminal-graphite-muted)]">
              For questions about these terms, a plan, or a transaction, email <a href="mailto:support@elitefund.sbs" className="font-medium text-[var(--brand-primary)] underline underline-offset-4">support@elitefund.sbs</a>.
            </p>
            <p className="mt-3 text-base leading-6 text-[var(--terminal-graphite-muted)]">
              Website: <Link href="/" className="font-medium text-[var(--brand-primary)] underline underline-offset-4">www.elitefund.sbs</Link>
            </p>
          </div>
        </div>
      </section>
      <footer className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--terminal-graphite-muted)]/20 pt-6 text-sm leading-5">
        <Link href="/privacy" className="text-[var(--brand-primary)] underline underline-offset-4">Privacy Policy</Link>
        <Link href="/cookies" className="text-[var(--brand-primary)] underline underline-offset-4">Cookie Policy</Link>
        <Link href="/" className="text-[var(--brand-primary)] underline underline-offset-4">Back to EliteFund</Link>
      </footer>
    </article>
  )
}

export default function TermsDocument({ sections }: TermsDocumentProps) {
  return (
    <main className="min-h-screen bg-[var(--terminal-graphite-bg)] font-sans text-[var(--terminal-graphite-text)] [--font-sans:var(--font-inter)]">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-7 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--terminal-graphite-muted)]/20 pb-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-[var(--terminal-graphite-text)] hover:text-[var(--brand-primary)]">
            EliteFund <span className="font-normal text-[var(--terminal-graphite-muted)]">/ Legal</span>
          </Link>
          <a href="mailto:support@elitefund.sbs" className="text-sm font-medium text-[var(--brand-primary)] underline underline-offset-4">
            Contact support
          </a>
        </header>

        <div className="max-w-3xl pt-12 sm:pt-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-primary)]">Legal document</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">EliteFund Terms &amp; Conditions</h1>
          <p className="mt-5 text-base leading-6 text-pretty text-[var(--terminal-graphite-muted)] sm:text-lg sm:leading-7">
            Please read these terms and the rules for your selected trading plan before creating an account, making a payment, or trading.
          </p>
          <p className="mt-5 text-sm leading-5 text-[var(--terminal-graphite-muted)]">
            Last updated <time dateTime="2026-11-03">3 November 2026</time>
          </p>
        </div>

        <TermsOverview />

        <div className="mt-12 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <TermsNavigation />
          <TermsArticle sections={sections} />
        </div>
      </div>
    </main>
  )
}
