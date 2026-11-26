import { Download, Smartphone } from "lucide-react"

export function ParticipantAndroidDownload({ apkUrl }: { apkUrl: string }) {
  return (
    <section aria-labelledby="android-ticket-heading" className="flex flex-col overflow-hidden rounded-2xl border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] text-[var(--terminal-graphite-text)] sm:flex-row">
      <div className="flex-1 p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-sm font-medium text-[var(--brand-primary)]"><Smartphone className="size-4" aria-hidden="true" /> EliteFund for Android</p>
        <h2 id="android-ticket-heading" className="mt-3 text-balance text-2xl font-semibold tracking-tight">What if your desk fit in your pocket?</h2>
        <p className="mt-2 max-w-lg text-pretty text-sm leading-6 text-[var(--terminal-graphite-muted)]">Open your trading workspace from your Android home screen instead of looking for the right browser tab.</p>
      </div>
      <div className="flex flex-col justify-center border-t border-dashed border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-bg)] p-5 sm:border-t-0 sm:border-l sm:p-6">
        <a href={apkUrl} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 font-semibold text-[var(--terminal-graphite-bg)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-primary)]"><Download aria-hidden="true" className="size-5" />Download Android APK</a>
        <p className="mt-2 text-center text-sm text-[var(--terminal-graphite-muted)]">Direct download · Android only</p>
      </div>
    </section>
  )
}
