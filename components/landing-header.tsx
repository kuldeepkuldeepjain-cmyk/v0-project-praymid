"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Menu, X } from "lucide-react"
import { FlowChainLogo } from "@/components/flowchain-logo"

const navigation = [
  ["Platform", "#platform"],
  ["Features", "#features"],
  ["Accounts", "#accounts"],
  ["Programs", "#programs"],
  ["Payouts", "#payout-records"],
  ["How it works", "#how-it-works"],
  ["FAQ", "#faq"],
] as const

export function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("platform")
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const sections = navigation
      .map(([, href]) => document.getElementById(href.slice(1)))
      .filter((section): section is HTMLElement => section !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visibleSection) setActiveSection(visibleSection.target.id)
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.1, 0.35] },
    )

    sections.forEach((section) => observer.observe(section))

    const updateScrollProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollableHeight > 0 ? Math.min(window.scrollY / scrollableHeight, 1) : 0)
    }
    updateScrollProgress()
    window.addEventListener("scroll", updateScrollProgress, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", updateScrollProgress)
    }
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [isMenuOpen])

  return (
    <>
      <a href="#main-content" className="elite-skip-link">Skip to content</a>
      <header className="elite-header sticky top-0 z-50">
        <nav aria-label="Primary navigation" className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" className="elite-brand-lockup" aria-label="Elite Fund home">
            <FlowChainLogo variant="icon" size="xs" showTagline={false} className="elite-brand-mark size-10 rounded-xl" />
            <span className="elite-brand-copy">
              <span className="elite-brand-name">Elite<span className="elite-brand-text">Fund</span></span>
              <span className="elite-brand-caption">Funded trading</span>
            </span>
          </Link>

          <div className="elite-nav-rail hidden items-center xl:flex">
            {navigation.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="elite-nav-link"
                aria-current={activeSection === href.slice(1) ? "location" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 xl:flex">
            <Link href="/participant/login" className="elite-header-login">Log in</Link>
            <Link href="/participant/register" className="elite-header-cta">
              Get started <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <Link href="/participant/login" className="elite-header-login elite-mobile-login">Log in</Link>
            <button
              type="button"
              className="elite-menu-button"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMenuOpen}
              aria-controls="elite-mobile-navigation"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {isMenuOpen && (
          <div id="elite-mobile-navigation" className="elite-mobile-navigation xl:hidden">
            {navigation.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={activeSection === href.slice(1) ? "location" : undefined}
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link href="/participant/register" className="elite-mobile-cta" onClick={() => setIsMenuOpen(false)}>
              Explore programs <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        )}
        <span className="elite-scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />
      </header>
    </>
  )
}
