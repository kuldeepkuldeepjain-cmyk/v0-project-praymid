"use client"

import { useState } from "react"
import { ArrowRight, Gift, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DiwaliGiftPromoProps {
  displayName: string
  onClaimPromo: () => void
}

export function DiwaliGiftPromo({ displayName, onClaimPromo }: DiwaliGiftPromoProps) {
  const [giftOpened, setGiftOpened] = useState(false)

  return (
    <section className="participant-diwali-promo" aria-labelledby="diwali-promo-title">
      <div className="participant-diwali-copy">
        <span className="participant-diwali-gift" data-open={giftOpened} aria-hidden="true">
          <Gift className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="participant-home-eyebrow"><Sparkles className="size-4" aria-hidden="true" /> Diwali special</p>
          <h2 id="diwali-promo-title" className="text-balance text-xl font-medium tracking-tight text-foreground">Happy Diwali, {displayName}.</h2>
          <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
            There&apos;s a little extra light waiting for your next add-funds payment.
          </p>
        </div>
      </div>

      {!giftOpened ? (
        <Button type="button" onClick={() => setGiftOpened(true)} aria-expanded={giftOpened} aria-controls={giftOpened ? "diwali-gift-reveal" : undefined} className="w-full rounded-xl sm:w-auto">
          Open your gift <ArrowRight data-icon="inline-end" />
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={() => setGiftOpened(false)} aria-expanded={giftOpened} aria-controls={giftOpened ? "diwali-gift-reveal" : undefined} className="w-full rounded-xl sm:w-auto">
          Gift opened
        </Button>
      )}

      {giftOpened && (
        <div id="diwali-gift-reveal" className="participant-diwali-reveal" aria-live="polite">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-medium text-foreground">A brighter start to your next move.</p>
            <p className="text-sm leading-6 text-muted-foreground">Enjoy 10% off the payment for your next add fund. Your requested funding amount stays the same.</p>
            <code className="participant-diwali-code w-fit rounded-lg px-3 py-2 text-sm font-semibold">HAPPYDIWALI</code>
          </div>
          <Button type="button" onClick={onClaimPromo} className="w-full shrink-0 rounded-xl sm:w-auto">
            Claim 10% off <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      )}
    </section>
  )
}
