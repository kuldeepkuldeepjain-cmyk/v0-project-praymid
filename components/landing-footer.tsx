import Link from "next/link"
import { FlowChainLogo } from "@/components/flowchain-logo"

export function LandingFooter() {
  return (
    <footer className="elite-footer">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
          <div className="max-w-sm">
            <Link href="/" className="elite-brand-lockup" aria-label="Elite Fund home">
              <FlowChainLogo variant="icon" size="xs" showTagline={false} className="elite-brand-mark size-8 rounded-full" />
              <span>Elite<span className="elite-brand-text">Fund</span></span>
            </Link>
            <p className="elite-copy mt-4 text-sm">A trading workspace for disciplined market participation.</p>
          </div>
          <div>
            <h2 className="elite-footer-title">Explore</h2>
            <ul className="elite-footer-links">
              <li><Link href="#features">Platform features</Link></li>
              <li><Link href="#programs">Challenge planner</Link></li>
              <li><Link href="#how-it-works">How it works</Link></li>
              <li><Link href="/leaderboard">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="elite-footer-title">Your account</h2>
            <ul className="elite-footer-links">
              <li><Link href="/participant/register">Create an account</Link></li>
              <li><Link href="/participant/login">Log in</Link></li>
              <li><Link href="#faq">Frequently asked questions</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="elite-footer-title">Legal</h2>
            <ul className="elite-footer-links">
              <li><Link href="/terms">Terms and risk disclosure</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="elite-risk-disclosure">
          <p><strong>Risk disclosure:</strong> Trading involves significant risk and may not be suitable for everyone. Past performance does not guarantee future results. Review all account terms before participating.</p>
          <Link href="/terms">Read the terms</Link>
        </div>
        <div className="flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="elite-muted">© 2026 Elite Fund. All rights reserved.</p>
          <p className="elite-muted">Platform previews are illustrative and may not reflect live market conditions.</p>
        </div>
      </div>
    </footer>
  )
}
