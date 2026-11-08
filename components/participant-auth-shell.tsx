import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CandlestickChart, LockKeyhole, WalletCards } from "lucide-react"
import { FlowChainLogoCompact } from "@/components/flowchain-logo"
import { cn } from "@/lib/utils"

export function ParticipantAuthShell({ children, mode }: { children: ReactNode; mode: "login" | "register" }) {
  return (
    <div className={cn("participant-auth-workspace min-h-dvh bg-background font-sans text-foreground", mode === "register" && "auth-register-workspace")}>
      <header className="auth-header flex items-center justify-between border-b border-border px-4 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2" aria-label="EliteFund home">
          <FlowChainLogoCompact size="md" />
          <span className="text-lg font-semibold tracking-tight">Elite<span className="text-primary">Fund</span></span>
        </Link>
        <Link href="/" className="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Home
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-6xl items-start lg:min-h-[calc(100dvh-97px)] lg:items-center">
        <aside className="hidden w-1/2 shrink-0 flex-col gap-12 px-12 py-16 lg:flex" aria-label="About EliteFund">
          <div className="flex flex-col gap-5">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Your trading workspace</p>
            <h2 className="text-balance text-5xl font-semibold leading-tight tracking-tight">A clear view.<br /><span className="text-primary">A focused next move.</span></h2>
            <p className="max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">Your markets, accounts, and trading tools. Together in one place, ready when you are.</p>
          </div>
          <div className="flex flex-col gap-6">
            {[
              { icon: CandlestickChart, title: "Stay close to the markets", text: "Access charts and your trading terminal." },
              { icon: WalletCards, title: "Keep your accounts in view", text: "Manage balances and account activity." },
              { icon: LockKeyhole, title: "Sign in on your terms", text: "Use your email or mobile, with a password or PIN." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4">
                <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-1"><h3 className="text-sm font-medium">{title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{text}</p></div>
              </div>
            ))}
          </div>
          <Link href={mode === "login" ? "/participant/register" : "/participant/login"} className="flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline">
            {mode === "login" ? "New here? Create an account" : "Already registered? Sign in"}<ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col items-center px-4 py-7 sm:px-8 sm:py-10 lg:border-l lg:border-border lg:px-12" aria-label={mode === "login" ? "Sign in" : "Registration"}>
          <div className="auth-form-panel flex w-full max-w-md flex-col gap-6">{children}</div>
          <footer className="flex w-full max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-8 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} EliteFund</span><Link href="/terms" className="min-h-11 content-center hover:text-foreground">Terms & risk disclosures</Link>
          </footer>
        </section>
      </main>
    </div>
  )
}
