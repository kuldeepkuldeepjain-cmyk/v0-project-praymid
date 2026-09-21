import Link from "next/link"

export const metadata = { title: "Privacy Policy | Elite Fund", description: "How Elite Fund collects and protects member information." }

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Policy" updated="September 21, 2026">
    <p>Elite Fund uses the information you provide to operate member accounts, review funding activity, support withdrawals, prevent abuse, and communicate important account updates.</p>
    <h2>Information we collect</h2><p>This may include your name, email address, mobile number, account credentials, referral information, payment or wallet details, identity or transaction evidence, support messages, device information, and activity logs.</p>
    <h2>How we use information</h2><p>We use information to authenticate you, process contributions and withdrawals, maintain ledgers, deliver notifications, calculate referral rewards, investigate suspicious activity, improve the platform, and comply with legal or operational obligations.</p>
    <h2>Sharing and service providers</h2><p>We share information only when needed to provide the service, protect members, process a transaction, respond to lawful requests, or enforce our terms. We do not sell member information.</p>
    <h2>Security and retention</h2><p>We use access controls, encrypted transport, session protections, and audit records designed to protect your information. No internet service is completely risk-free. We retain records for as long as necessary for account operations, disputes, fraud prevention, and legal requirements.</p>
    <h2>Your choices</h2><p>You may request correction of inaccurate profile information or ask questions about how your information is used. Some records must be retained to complete transactions or meet legal obligations. Contact support through the <Link href="/lending" className="text-cyan-300 underline">lending page</Link>.</p>
  </PolicyPage>
}

function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-200 sm:py-16"><div className="mx-auto max-w-3xl"><Link href="/lending" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to lending</Link><p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Legal</p><h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">{title}</h1><p className="mt-3 text-sm text-slate-500">Last updated {updated}</p><article className="policy-content mt-10 space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm leading-7 text-slate-300 shadow-xl sm:p-10">{children}</article><p className="mt-8 text-center text-xs text-slate-500">Elite Fund · Cameroon · Online member platform</p></div></main>
}
