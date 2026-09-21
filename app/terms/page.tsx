import Link from "next/link"

export const metadata = { title: "Terms of Use | Elite Fund", description: "Terms governing use of the Elite Fund lending platform." }

export default function TermsPage() {
  return <PolicyPage title="Terms of Use" eyebrow="Legal" updated="September 21, 2026">
    <p>These Terms of Use govern access to the Elite Fund website, member dashboard, lending information, contribution flows, and related services. By creating an account or using the platform, you agree to these terms.</p>
    <h2>1. Eligibility and accounts</h2><p>You must provide accurate information, keep your login credentials confidential, and use only your own account. We may suspend access when information is inaccurate, activity is abusive, or an account presents a security or compliance risk.</p>
    <h2>2. Lending participation</h2><p>Information on this page is general platform information, not personal financial, investment, tax, or legal advice. Any opportunity is subject to its displayed terms, available capacity, approval, and applicable checks. Contributions are not bank deposits and are not guaranteed by Elite Fund or any government scheme.</p>
    <h2>3. Risk and returns</h2><p>Participation involves the possible loss or delay of funds. Past performance and displayed projections do not guarantee future results. Do not contribute money you need for essential expenses. You are responsible for reviewing an opportunity before confirming a contribution.</p>
    <h2>4. Funding and withdrawals</h2><p>Funding requests may require proof, review, and manual approval. Processing times can vary because of payment networks, verification, weekends, and risk controls. Withdrawal requests are subject to account status, available balance, applicable rules, and verification.</p>
    <h2>5. Prohibited use</h2><p>Do not use the platform for fraud, money laundering, impersonation, unauthorized access, market manipulation, automated abuse, or any activity that violates applicable law.</p>
    <h2>6. Changes and contact</h2><p>We may update these terms when the platform or requirements change. The latest version will be posted here. For questions, contact member support through the WhatsApp channel shown on the <Link href="/lending" className="text-cyan-300 underline">lending page</Link>.</p>
  </PolicyPage>
}

function PolicyPage({ title, eyebrow, updated, children }: { title: string; eyebrow: string; updated: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-200 sm:py-16"><div className="mx-auto max-w-3xl"><Link href="/lending" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to lending</Link><p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">{title}</h1><p className="mt-3 text-sm text-slate-500">Last updated {updated}</p><article className="policy-content mt-10 space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm leading-7 text-slate-300 shadow-xl sm:p-10">{children}</article><p className="mt-8 text-center text-xs text-slate-500">Elite Fund · Cameroon · Online member platform</p></div></main>
}
