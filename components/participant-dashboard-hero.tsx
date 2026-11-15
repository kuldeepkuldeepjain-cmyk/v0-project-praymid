"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, ChartCandlestick, ScanLine, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ParticipantDashboardHeroProps {
  displayName: string
  isChallenge?: boolean
  onExploreTerminal: () => void
}

export function ParticipantDashboardHero({ displayName, isChallenge = false, onExploreTerminal }: ParticipantDashboardHeroProps) {
  return (
    <section className="participant-vault-hero" aria-labelledby="participant-welcome-title">
      <Image src="/images/dashboard-vault.png" alt="" fill priority sizes="(min-width: 1280px) 750px, (min-width: 1024px) 65vw, 100vw" className="participant-vault-art" />
      <div className="participant-vault-copy">
        <p className="participant-home-eyebrow"><ScanLine className="size-4" aria-hidden="true" /> {isChallenge ? "Your evaluation workspace" : "Your personal trading space"}</p>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Welcome back, <span className="text-foreground break-words">{displayName}.</span></p>
          <h1 id="participant-welcome-title" className="text-balance text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">{isChallenge ? "Discipline is" : "Your next move."}<br /><span className="text-primary">{isChallenge ? "your edge." : "A new perspective."}</span></h1>
          <p className="max-w-72 text-pretty text-sm leading-6 text-muted-foreground">{isChallenge ? "Know your limits. Follow your plan. Keep your evaluation in focus." : "Step inside your markets. See the bigger picture. Move with intention."}</p>
        </div>
        <div className="participant-vault-actions">
          <Button type="button" size="lg" onClick={onExploreTerminal} className="participant-vault-action participant-terminal-cta rounded-xl">
            <ChartCandlestick data-icon="inline-start" aria-hidden="true" />
            <span className="sm:hidden">Terminal</span>
            <span className="hidden sm:inline">Enter trading terminal</span>
            <ArrowUpRight data-icon="inline-end" />
          </Button>
          {!isChallenge && (
            <Button asChild size="lg" variant="outline" className="participant-vault-action participant-prediction-cta rounded-xl">
              <Link href="/participant/dashboard/predict">
                <Sparkles data-icon="inline-start" aria-hidden="true" />
                <span className="sm:hidden">Prediction</span>
                <span className="hidden sm:inline">Open predictions</span>
                <ArrowUpRight data-icon="inline-end" className="hidden sm:block" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
