"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, ChartCandlestick, Radar, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ParticipantDashboardHeroProps {
  displayName: string
  isChallenge?: boolean
  onExploreTerminal: () => void
}

export function ParticipantDashboardHero({ displayName, isChallenge = false, onExploreTerminal }: ParticipantDashboardHeroProps) {
  return (
    <section className="participant-command-hero relative" aria-labelledby="participant-welcome-title">
      <Image src="/images/dashboard-vault.png" alt="" fill priority sizes="(min-width: 1280px) 800px, (min-width: 900px) 65vw, 100vw" className="participant-command-hero-art" />
      <div className="participant-command-hero-copy">
        <Badge variant="secondary" className="participant-command-hero-badge">
          <Radar data-icon="inline-start" aria-hidden="true" />
          {isChallenge ? "Evaluation workspace" : "Markets are ready"}
        </Badge>
        <div className="flex max-w-xl flex-col gap-3">
          <p className="text-sm text-muted-foreground">{isChallenge ? "Challenge account" : `Trading workspace for ${displayName}`}</p>
          <h2 id="participant-welcome-title" className="text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {isChallenge ? "Trade the plan." : "Your market workspace,"}<br />
            <span className="text-primary">{isChallenge ? "Protect the downside." : "ready when you are."}</span>
          </h2>
          <p className="max-w-md text-pretty text-sm leading-6 text-muted-foreground">
            {isChallenge
              ? "Monitor your evaluation rules, manage risk, and keep every decision within your limits."
              : "Open charts, review opportunities, and manage your account from one focused command center."}
          </p>
        </div>
        <div className="participant-command-hero-actions">
          <Button type="button" size="lg" onClick={onExploreTerminal} className="participant-vault-action participant-terminal-cta rounded-xl">
            <ChartCandlestick data-icon="inline-start" aria-hidden="true" />
            Open terminal
            <ArrowUpRight data-icon="inline-end" />
          </Button>
          {!isChallenge && (
            <Button asChild size="lg" variant="outline" className="participant-vault-action participant-prediction-cta rounded-xl">
              <Link href="/participant/dashboard/predict">
                <Sparkles data-icon="inline-start" aria-hidden="true" />
                Predictions
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
