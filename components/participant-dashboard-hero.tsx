"use client"

import Image from "next/image"
import { ArrowUpRight, ScanLine } from "lucide-react"
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
        <div className="flex items-center gap-3">
          <Button type="button" size="lg" onClick={onExploreTerminal} className="rounded-xl">Enter trading terminal <ArrowUpRight data-icon="inline-end" /></Button>
        </div>
      </div>
    </section>
  )
}
