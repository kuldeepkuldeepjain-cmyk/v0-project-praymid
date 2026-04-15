"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FlowChainLogo } from "@/components/flowchain-logo"
import {
  ArrowRight,
  Activity,
  TrendingUp,
  Globe,
  Zap,
  Shield,
  Users,
  Wallet,
  Check,
  Award,
  Menu,
  X,
  Sparkles,
  BarChart3,
  Lock,
  CreditCard,
  BookOpen,
  Clock,
  Star,
  Rocket,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { LearnMoreDialog } from "@/components/learn-more-dialog"
import { AIChatbotDialog } from "@/components/ai-chatbot-dialog"

function Particle({
  delay,
  size,
  color,
  left,
  duration,
}: { delay: number; size: number; color: string; left: string; duration: number }) {
  return (
    <div
      className="particle animate-particle"
      style={{
        width: size,
        height: size,
        background: color,
        left: left,
        bottom: "-20px",
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        filter: "blur(1px)",
      }}
    />
  )
}

function AnimatedStar({ top, left, delay, size }: { top: string; left: string; delay: number; size: number }) {
  return (
    <div
      className="star"
      style={{
        top,
        left,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

function FlowRibbon({ top, delay, width }: { top: string; delay: number; width: string }) {
  return (
    <div
      className="flow-ribbon"
      style={{
        top,
        width,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

function Card3D({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [transform, setTransform] = useState("")

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = (y - centerY) / 10
    const rotateY = (centerX - x) / 10
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
  }

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)")
  }

  return (
    <div
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{ transform, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

function FloatingCoin({
  src,
  size,
  initialX,
  initialY,
  driftRange,
  delay,
  duration,
}: {
  src: string
  size: number
  initialX: string
  initialY: string
  driftRange: number
  delay: number
  duration: number
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Random drift animation
    const driftInterval = setInterval(() => {
      setPosition({
        x: (Math.random() - 0.5) * driftRange * 2,
        y: (Math.random() - 0.5) * driftRange * 2,
      })
      // 3D tilt rotation
      setRotation({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
      })
    }, duration * 1000)

    return () => {
      clearInterval(driftInterval)
    }
  }, [driftRange, duration])

  return (
    <div
      className="absolute transition-all ease-in-out"
      style={{
        left: initialX,
        top: initialY,
        width: size,
        height: size,
        transform: `translate(${position.x}px, ${position.y}px) perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        opacity: 0.5,
        transitionDuration: `${duration}s`,
      }}
    >
      <img
        src={src || "/placeholder.svg"}
        alt="Crypto coin"
        className="w-full h-full object-contain"
        style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.2))" }}
      />
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const partnerLogos = ["OpenAI", "Amazon", "Google", "Anthropic", "Shopify", "Airbnb", "Stripe", "Vercel"]

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  const particles = Array.from({ length: 20 }, (_, i) => ({
    delay: Math.random() * 5,
    size: Math.random() * 8 + 4,
    color: ["rgba(232, 93, 59, 0.6)", "rgba(124, 58, 237, 0.6)", "rgba(34, 211, 238, 0.6)", "rgba(16, 185, 129, 0.6)"][
      Math.floor(Math.random() * 4)
    ],
    left: `${Math.random() * 100}%`,
    duration: Math.random() * 4 + 4,
  }))

  const stars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 3,
        size: Math.random() * 3 + 2,
      })),
    [],
  )

  const ribbons = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        top: `${20 + i * 15}%`,
        delay: i * 1.5,
        width: `${Math.random() * 300 + 200}px`,
      })),
    [],
  )

  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      <div className="fixed inset-0 aurora-bg" />
      <div className="fixed inset-0 mesh-gradient-light" />
      <div className="fixed inset-0 grid-pattern-light" />
      <div className="fixed inset-0 texture-overlay" />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="wave-pattern" />
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        {stars.map((star, i) => (
          <AnimatedStar key={i} {...star} />
        ))}
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        {ribbons.map((ribbon, i) => (
          <FlowRibbon key={i} {...ribbon} />
        ))}
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center hidden md:block">
        <div
          className="rotating-ring w-[800px] h-[800px] opacity-30"
          style={{ transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)` }}
        />
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="light-beam" style={{ top: "20%", animationDelay: "0s" }} />
        <div className="light-beam" style={{ top: "50%", animationDelay: "3s" }} />
        <div className="light-beam" style={{ top: "80%", animationDelay: "6s" }} />
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        {/* Floating blobs - Hidden on mobile for better performance */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            style={{ borderRadius: "40% 60% 55% 45% / 55% 45% 55% 45%", willChange: "transform" }}
            className="blob animate-morph-enhanced absolute w-[600px] h-[600px] -top-48 left-0 bg-gradient-to-br from-[#E85D3B]/35 to-orange-300/30 animate-float-slow"
          />
          <div
            className="blob animate-morph-enhanced absolute w-[700px] h-[700px] top-1/4 -right-32 bg-gradient-to-br from-purple-400/30 to-cyan-300/25 animate-float"
            style={{
              animationDelay: "2s",
              transform: `translate(${-mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
              willChange: "transform",
            }}
          />
          <div
            className="blob animate-morph-enhanced absolute w-[600px] h-[600px] bottom-1/4 left-1/4 bg-gradient-to-br from-cyan-300/25 to-purple-300/25 animate-float-slow"
            style={{
              animationDelay: "4s",
              transform: `translate(${mousePosition.x * 0.015}px, ${-mousePosition.y * 0.015}px)`,
              willChange: "transform",
            }}
          />
        </div>

        <div
          className="glow-orb absolute w-[400px] h-[400px] top-1/2 right-1/4 bg-gradient-to-br from-[#E85D3B]/40 to-yellow-300/30"
          style={{ animationDelay: "1s", willChange: "transform" }}
        />
        <div
          className="glow-orb absolute w-[350px] h-[350px] bottom-1/3 left-1/3 bg-gradient-to-br from-purple-500/30 to-pink-400/25"
          style={{ animationDelay: "2s", willChange: "transform" }}
        />
        <div
          className="glow-orb absolute w-[300px] h-[300px] top-1/3 left-1/2 bg-gradient-to-br from-cyan-400/30 to-green-300/25"
          style={{ animationDelay: "3s", willChange: "transform" }}
        />
      </div>

      {/* Particle system - Hidden on mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-10 hidden md:block">
        {/* USDT Coin - Green (Large) - Moved to left side, middle height */}
        <FloatingCoin
          src="/images/c.png"
          size={207}
          initialX="8%"
          initialY="40%"
          driftRange={70}
          delay={0.3}
          duration={5.6}
        />

        {/* TRON Coin - Red (Large) - Moved to top-right corner */}
        <FloatingCoin
          src="/images/screenshot-202026-01-14-20165119.png"
          size={230}
          initialX="82%"
          initialY="8%"
          driftRange={90}
          delay={0.5}
          duration={6}
        />

        {/* BNB Coin - Yellow (Medium) - Moved to bottom-right area */}
        <FloatingCoin
          src="/images/h.png"
          size={127}
          initialX="88%"
          initialY="75%"
          driftRange={55}
          delay={1.8}
          duration={4.6}
        />
      </div>

      {/* Header */}
      <header className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 border border-gray-200/80 overflow-hidden hover:shadow-[0_20px_60px_-15px_rgba(232,93,59,0.2)] transition-all duration-500">
          <div className="px-6 lg:px-8">
            <nav className="flex items-center justify-between h-16 md:h-20">
              <FlowChainLogo size="sm" showTagline={false} />

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-8">
                <a
                  href="#how-it-works"
                  className="text-sm text-gray-900 hover:text-[#E85D3B] transition-all duration-300 font-semibold relative group"
                >
                  How it Works
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#E85D3B] to-[#d14d2c] group-hover:w-full transition-all duration-300" />
                </a>
                <a
                  href="#leaderboard"
                  className="text-sm text-gray-900 hover:text-[#E85D3B] transition-all duration-300 font-semibold relative group"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push("/leaderboard")
                  }}
                >
                  Leaderboard
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#E85D3B] to-[#d14d2c] group-hover:w-full transition-all duration-300" />
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/participant/login")}
                  className="text-gray-900 hover:text-[#E85D3B] hover:bg-gray-100/80 font-semibold hidden sm:inline-flex transition-all duration-300 rounded-xl"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/participant/register")}
                  className="relative bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-size-200 hover:from-green-500 hover:via-blue-500 hover:to-purple-500 text-black font-bold shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-pink-500/50 hover:scale-105 transition-all duration-500 rounded-xl overflow-hidden"
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                </Button>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden hover:bg-gray-100/80 rounded-xl transition-all duration-300"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </nav>

            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-gray-100 animate-fade-in-up">
                <div className="flex flex-col gap-3">
                  <a
                    href="#how-it-works"
                    className="text-gray-900 hover:text-[#E85D3B] py-2.5 px-3 font-medium transition-all duration-300 rounded-xl hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    How it Works
                  </a>
                  <a
                    href="#leaderboard"
                    className="text-gray-900 hover:text-[#E85D3B] py-2.5 px-3 font-medium transition-all duration-300 rounded-xl hover:bg-gray-50"
                    onClick={(e) => {
                      e.preventDefault()
                      router.push("/leaderboard")
                      setMobileMenuOpen(false)
                    }}
                  >
                    Leaderboard
                  </a>
                  <Button
                    variant="outline"
                    className="mt-2 bg-white border-gray-300 hover:bg-gray-50 rounded-xl transition-all duration-300"
                    onClick={() => router.push("/participant/login")}
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content - Enhanced with 3D slide animation */}
            <div className="space-y-8 animate-slide-in-left-3d">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-100 relative overflow-hidden group">
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Trusted by 50,000+ participants</span>
                <Star className="h-3 w-3 text-yellow-500 animate-spin" style={{ animationDuration: "3s" }} />
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: "0.1s" }}>
                    <span className="bg-gradient-to-r from-[#E85D3B] via-orange-500 to-[#E85D3B] text-transparent bg-clip-text bg-size-200 animate-gradient-x">
                      Financial
                    </span>
                  </span>
                  <br />
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: "0.2s" }}>
                    infrastructure
                  </span>
                  <br />
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: "0.3s" }}>
                    to grow your
                  </span>
                  <br />
                  <span className="inline-block animate-text-reveal" style={{ animationDelay: "0.4s" }}>
                    <span className="relative">
                      <span className="text-[#E85D3B]">network</span>
                      
                    </span>
                  </span>
                </h1>
                <p
                  className="text-lg sm:text-xl text-gray-600 max-w-lg leading-relaxed animate-fade-in-up"
                  style={{ animationDelay: "0.5s" }}
                >
                  Join the millions who use FlowChain to participate in structured contribution networks, manage
                  rewards, and build a more profitable future.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
                <Button
                  size="lg"
                  onClick={() => router.push("/participant/register")}
                  className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-[#E85D3B] to-[#d14d2c] hover:from-[#d14d2c] hover:to-[#E85D3B] text-white rounded-full shadow-lg shadow-[#E85D3B]/30 hover:shadow-xl hover:shadow-[#E85D3B]/50 hover:scale-105 transition-all duration-300 glow-pulse relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    Get Started
                    <Rocket className="ml-2 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowLearnMore(true)}
                  className="h-14 px-8 text-lg font-semibold border-2 border-gray-300 hover:border-[#E85D3B] hover:bg-orange-50 rounded-full group transition-all duration-300"
                >
                  <BookOpen className="mr-2 h-5 w-5 text-[#E85D3B] group-hover:rotate-12 transition-transform" />
                  Learn More
                </Button>
              </div>

              <div className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">2,847</span> people joined today
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 ml-2" />
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview - Enhanced with 3D card effect */}
            <div className="relative animate-slide-in-right-3d">
              <Card3D className="relative">
                <div
                  className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#E85D3B]/20 via-purple-500/20 to-cyan-500/20 blur-2xl"
                  style={{ animationDuration: "3s" }}
                />

                {/* Main dashboard mockup */}
                <div className="dashboard-mockup p-4 sm:p-6 animate-float-slow relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100">
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 shimmer opacity-30" />
                  </div>

                  {/* Dashboard header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E85D3B] to-[#d14d2c] flex items-center justify-center shadow-lg shadow-[#E85D3B]/30 animate-scale-bounce">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Dashboard</div>
                        <div className="text-xs text-gray-500">Today</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-gray-500">Live</span>
                    </div>
                  </div>

                  {/* Stats row - Enhanced with 3D hover effects */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Volume", value: "$24,847", change: "+12.5%", color: "purple" },
                      { label: "Users", value: "2,847", change: "+8.2%", color: "cyan" },
                      { label: "Rewards", value: "$4,521", change: "+15.3%", color: "orange" },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100/50 rounded-xl p-3 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer group`}
                      >
                        <div className={`text-xs text-${stat.color}-600 font-medium mb-1`}>{stat.label}</div>
                        <div className="text-lg font-bold text-gray-900 group-hover:text-[#E85D3B] transition-colors">
                          {stat.value}
                        </div>
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3" />
                          {stat.change}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder - Enhanced with animated line */}
                  <div className="h-32 bg-gradient-to-t from-purple-100/50 to-transparent rounded-xl relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#E85D3B" />
                          <stop offset="50%" stopColor="#7c3aed" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,80 Q50,60 100,70 T200,50 T300,60 T400,30 L400,100 L0,100 Z"
                        fill="url(#chartGradient)"
                      />
                      <path
                        d="M0,80 Q50,60 100,70 T200,50 T300,60 T400,30"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="animate-draw-line"
                      />
                      <circle cx="400" cy="30" r="4" fill="#22d3ee">
                        <animate attributeName="cx" values="0;400" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="cy" values="80;30" dur="3s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                </div>

                {/* Floating notification card - Enhanced animations */}
                <div
                  className="absolute -bottom-4 -left-4 sm:-left-8 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 animate-float hover:scale-110 transition-transform cursor-pointer group"
                  style={{ animationDelay: "1s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:rotate-12 transition-transform">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Payment Received</div>
                      <div className="text-xs text-green-600 font-medium">+$100.00 USDT</div>
                    </div>
                  </div>
                </div>

                {/* Floating rank badge - Enhanced with glow */}
                <div
                  className="absolute -top-4 -right-4 sm:-right-8 bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 animate-float hover:scale-110 transition-transform cursor-pointer group"
                  style={{ animationDelay: "2s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:rotate-12 transition-transform animate-scale-bounce">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Gold Rank</div>
                      <div className="text-xs text-orange-600 font-medium">+5% bonus</div>
                    </div>
                  </div>
                </div>

                <div
                  className="absolute top-1/2 -left-12 bg-white rounded-xl shadow-xl p-3 border border-gray-100 animate-float hidden lg:block"
                  style={{ animationDelay: "3s" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">Live</div>
                  </div>
                </div>
              </Card3D>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[#E85D3B]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#7c3aed]/10 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/3 w-64 h-64 bg-[#22d3ee]/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Headline */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-orange-100 text-[#E85D3B] text-sm font-medium mb-6 border border-purple-200/50">
              Protocol & Transparency
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] bg-clip-text text-transparent">
                Automated Community Protocol:
              </span>
              <br />
              <span className="text-gray-900 mt-2 block">
                A peer-to-peer economic system powered by immutable logic and global participant unity.
              </span>
            </h2>
          </div>

          {/* 3 Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-end">
            {/* Card 1 - Documentation */}
            <div
              className="group relative h-[420px] cursor-pointer"
              onClick={() => window.open("https://docs.flowchain.com", "_blank")}
            >
              <div className="absolute -inset-[2px] bg-gradient-to-b from-[#E85D3B] to-orange-400 rounded-3xl opacity-0 group-hover:opacity-60 blur-sm transition-all duration-500" />
              <div className="absolute -inset-[1px] bg-gradient-to-b from-[#E85D3B] to-orange-400 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" />

              <div className="relative h-full bg-gradient-to-b from-white to-orange-50/50 rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl hover:shadow-[#E85D3B]/40 transition-all duration-500 overflow-hidden border border-orange-200/50 group-hover:scale-[1.02]">
                {/* Corner decorative lines */}
                <div className="absolute top-4 right-4 w-16 h-16">
                  <div className="absolute top-0 right-0 w-8 h-[1px] bg-[#E85D3B]/30 group-hover:w-12 transition-all" />
                  <div className="absolute top-0 right-0 w-[1px] h-8 bg-[#E85D3B]/30 group-hover:h-12 transition-all" />
                </div>
                <div className="absolute bottom-4 left-4 w-16 h-16">
                  <div className="absolute bottom-0 left-0 w-8 h-[1px] bg-[#E85D3B]/30 group-hover:w-12 transition-all" />
                  <div className="absolute bottom-0 left-0 w-[1px] h-8 bg-[#E85D3B]/30 group-hover:h-12 transition-all" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#E85D3B] transition-colors">
                  Documentation
                </h3>
                <p className="text-gray-600 mb-6">Participant learning platform</p>

                <Button
                  variant="outline"
                  className="rounded-full border-[#E85D3B] text-[#E85D3B] hover:bg-[#E85D3B] hover:text-white transition-all bg-transparent group-hover:shadow-lg group-hover:shadow-[#E85D3B]/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open("https://docs.flowchain.com", "_blank")
                  }}
                >
                  Start Learning
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                {/* Bottom illustration - Document icons with animation */}
                <div className="absolute bottom-6 right-6 flex items-end gap-2">
                  <div className="w-12 h-14 rounded-lg bg-orange-100/50 border border-orange-200 group-hover:translate-y-[-4px] transition-transform" />
                  <div className="w-14 h-20 rounded-lg bg-gradient-to-b from-[#E85D3B] to-[#d14d2c] shadow-lg shadow-[#E85D3B]/30 flex flex-col items-center justify-center gap-1 p-2 group-hover:translate-y-[-8px] group-hover:shadow-xl group-hover:shadow-[#E85D3B]/50 transition-all">
                    <Rocket className="h-5 w-5 text-white group-hover:rotate-12 transition-transform" />
                    <div className="w-8 h-[2px] bg-white/60 rounded" />
                    <div className="w-6 h-[2px] bg-white/40 rounded" />
                  </div>
                  <div className="w-10 h-12 rounded-lg bg-orange-100/50 border border-orange-200 group-hover:translate-y-[-2px] transition-transform" />
                </div>
              </div>
            </div>

            {/* Card 2 - AI Powered (Featured - Taller) */}
            <div
              className="group relative h-[480px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setIsChatOpen(true)
              }}
            >
              {/* Glowing border effect */}
              <div className="absolute -inset-[2px] bg-gradient-to-b from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] rounded-3xl opacity-80 blur-sm group-hover:opacity-100 transition-opacity" />
              <div className="absolute -inset-[1px] bg-gradient-to-b from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] rounded-3xl" />

              <div className="relative h-full bg-gradient-to-b from-white to-purple-50/50 rounded-3xl p-6 lg:p-8 shadow-2xl overflow-hidden group-hover:scale-[1.02] transition-all duration-500">
                {/* Corner decorative lines */}
                <div className="absolute top-4 right-4 w-20 h-20">
                  <div className="absolute top-0 right-0 w-10 h-[1px] bg-[#7c3aed]/40" />
                  <div className="absolute top-0 right-0 w-[1px] h-10 bg-[#7c3aed]/40" />
                </div>
                <div className="absolute bottom-4 left-4 w-20 h-20">
                  <div className="absolute bottom-0 left-0 w-10 h-[1px] bg-[#7c3aed]/40" />
                  <div className="absolute bottom-0 left-0 w-[1px] h-10 bg-[#7c3aed]/40" />
                </div>
                <div className="absolute top-4 left-4 w-20 h-20">
                  <div className="absolute top-0 left-0 w-10 h-[1px] bg-[#7c3aed]/40" />
                  <div className="absolute top-0 left-0 w-[1px] h-10 bg-[#7c3aed]/40" />
                </div>
                <div className="absolute bottom-4 right-4 w-20 h-20">
                  <div className="absolute bottom-0 right-0 w-10 h-[1px] bg-[#7c3aed]/40" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-10 bg-[#7c3aed]/40" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">AI powered</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Suggest optimal business strategies from based on historical data and market.
                </p>

                <Button 
                  className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#E85D3B] hover:from-[#6d28d9] hover:to-[#d14d2c] text-white border-0 transition-all shadow-lg shadow-purple-500/25"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsChatOpen(true)
                  }}
                >
                  Get Started
                </Button>

                {/* Bottom illustration - AI Badge */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-b from-[#7c3aed] to-[#E85D3B] shadow-2xl shadow-purple-500/30 flex items-center justify-center border border-white/20">
                    <span className="text-white text-2xl font-bold">AI</span>
                    <Sparkles className="h-5 w-5 text-[#22d3ee] ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 - Live Chat */}
            <div
              className="group relative h-[420px] cursor-pointer"
              onClick={() => router.push("/participant/dashboard")}
            >
              <div className="absolute -inset-[2px] bg-gradient-to-b from-[#22d3ee] to-cyan-400 rounded-3xl opacity-0 group-hover:opacity-60 blur-sm transition-all duration-500" />
              <div className="absolute -inset-[1px] bg-gradient-to-b from-[#22d3ee] to-cyan-400 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" />

              <div className="relative h-full bg-gradient-to-b from-white to-cyan-50/50 rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl hover:shadow-[#22d3ee]/40 transition-all duration-500 overflow-hidden border border-cyan-200/50 group-hover:scale-[1.02]">
                {/* Corner decorative lines with animation */}
                <div className="absolute top-4 right-4 w-16 h-16">
                  <div className="absolute top-0 right-0 w-8 h-[1px] bg-[#22d3ee]/40 group-hover:w-12 transition-all" />
                  <div className="absolute top-0 right-0 w-[1px] h-8 bg-[#22d3ee]/40 group-hover:h-12 transition-all" />
                </div>
                <div className="absolute bottom-4 left-4 w-16 h-16">
                  <div className="absolute bottom-0 left-0 w-8 h-[1px] bg-[#22d3ee]/40 group-hover:w-12 transition-all" />
                  <div className="absolute bottom-0 left-0 w-[1px] h-8 bg-[#22d3ee]/40 group-hover:h-12 transition-all" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#22d3ee] transition-colors">
                  Live Chat
                </h3>
                <p className="text-gray-600 mb-6">Platform where you can ask a question to experienced participants</p>

                <Button
                  className="rounded-full bg-[#22d3ee] hover:bg-[#06b6d4] text-gray-900 font-semibold transition-all shadow-lg shadow-cyan-500/25 group-hover:shadow-xl group-hover:shadow-cyan-500/40"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push("/participant/dashboard")
                  }}
                >
                  Find a mentor
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                {/* Bottom illustration - Chat messages with animation */}
                <div className="absolute bottom-6 right-4 left-4 space-y-3">
                  {/* Chat message 1 - left aligned */}
                  <div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center border border-cyan-200 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4 text-[#22d3ee]" />
                    </div>
                    <div className="flex-1 flex gap-1">
                      <div className="h-2 w-16 bg-gray-200 rounded-full group-hover:bg-[#22d3ee]/30 transition-colors" />
                      <div className="h-2 w-8 bg-gray-100 rounded-full group-hover:bg-[#22d3ee]/20 transition-colors" />
                    </div>
                  </div>
                  {/* Chat message 2 - right aligned with accent */}
                  <div className="flex items-center gap-2 justify-end group-hover:-translate-x-2 transition-transform">
                    <div className="flex gap-1">
                      <div className="h-2 w-20 bg-[#22d3ee] rounded-full group-hover:bg-[#06b6d4] transition-colors" />
                      <div className="h-2 w-12 bg-[#22d3ee]/60 rounded-full group-hover:bg-[#06b6d4]/60 transition-colors" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center relative border border-cyan-200 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4 text-[#22d3ee]" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white group-hover:scale-125 transition-transform" />
                    </div>
                  </div>
                  {/* Chat message 3 - left aligned */}
                  <div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center border border-cyan-200 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4 text-[#22d3ee]" />
                    </div>
                    <div className="flex-1 flex gap-1">
                      <div className="h-2 w-12 bg-gray-200 rounded-full group-hover:bg-[#22d3ee]/30 transition-colors" />
                      <div className="h-2 w-20 bg-gray-100 rounded-full group-hover:bg-[#22d3ee]/20 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden md:py-px">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7c3aed]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#E85D3B]/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22d3ee]/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-cyan-100 border border-emerald-200/50 mb-6">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700 text-sm font-semibold">100% DECENTRALIZED PLATFORM</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] bg-clip-text text-transparent">
                Trust Through Transparency
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform operates on immutable blockchain logic with zero central control. Every transaction is
              verifiable, every process is automated.
            </p>
          </div>

          {/* Trust Claims Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Claim 1 - Transparency */}
            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-emerald-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  100% Transparency & Audit-Ready
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Every transaction and payout is recorded on a public ledger that anyone can verify. Nothing is hidden
                  here.
                </p>
              </div>
            </div>

            {/* Claim 2 - No Central Pool */}
            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-[#E85D3B] to-orange-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-orange-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E85D3B] to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#E85D3B] transition-colors">
                  No Central Pool (Zero Exit Scam Risk)
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your money never goes to any company bank account. It flows directly Wallet-to-Wallet from one
                  participant to another.
                </p>
              </div>
            </div>

            {/* Claim 3 - Instant P2P */}
            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-[#22d3ee] to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-cyan-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22d3ee] to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#22d3ee] transition-colors">
                  Instant Peer-to-Peer Settlements
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  No waiting for payouts. As soon as your turn comes, funds are transferred directly to your BEP20 or
                  ERC20 wallet.
                </p>
              </div>
            </div>

            {/* Claim 4 - Sustainable Growth */}
            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-pink-500 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-pink-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-pink-500 transition-colors">
                  Sustainable Growth Engine
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Through prediction markets and referral rewards, we have built an ecosystem that provides long-term
                  earning opportunities for the community.
                </p>
              </div>
            </div>

            {/* Claim 5 - Decentralized */}
            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-indigo-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-indigo-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-500 transition-colors">
                  100% Decentralized Platform
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  No central authority, no single point of failure. The system is fully distributed and controlled by
                  the community.
                </p>
              </div>
            </div>

            {/* Claim 6 - Direct P2P Distribution */}
            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-amber-500 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-amber-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-amber-500 transition-colors">
                  Direct P2P Distribution
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Eliminating the middleman. Direct participant-to-participant flow ensures maximum transparency and
                  instant settlements without any intermediaries.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA Banner */}
          <div className="mt-16 max-w-4xl mx-auto">
            
          </div>
        </div>
      </section>
      {/* End of Trust Claims Section */}

      {/* Stats Section */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                value: "50K+",
                label: "Active Participants",
                icon: Users,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              { value: "$2.5M+", label: "Total Volume", icon: Wallet, color: "text-[#E85D3B]", bg: "bg-orange-50" },
              { value: "150+", label: "Countries", icon: Globe, color: "text-cyan-600", bg: "bg-cyan-50" },
              { value: "99.9%", label: "Uptime", icon: Activity, color: "text-green-600", bg: "bg-green-50" },
            ].map((stat, i) => (
              <div
                key={i}
                className="metric-card text-center group animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${stat.bg} mb-4 group-hover:scale-110 transition-transform`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1 leading-7 tracking-tighter">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      {/* Removed Features Section */}

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-[#E85D3B] text-sm font-medium mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Get started in <span className="gradient-text-coral">3 simple steps</span>
            </h2>
            <p className="text-lg text-gray-600">Join thousands of participants in our structured network.</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#E85D3B] via-purple-500 to-cyan-500" />

              {[
                {
                  step: "01",
                  title: "Create Account",
                  description:
                    "Sign up with your details, complete profile setup, and pay the one-time activation fee.",
                  icon: Users,
                  color: "#E85D3B",
                },
                {
                  step: "02",
                  title: "Make Contribution",
                  description: "Submit your contribution through secure crypto or bank transfer methods.",
                  icon: CreditCard,
                  color: "#7c3aed",
                },
                {
                  step: "03",
                  title: "Start Earning",
                  description: "Access the network, complete challenges, and watch your rewards grow.",
                  icon: TrendingUp,
                  color: "#22d3ee",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative text-center animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  <div className="relative z-10 mb-6">
                    <div
                      className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-white text-2xl font-bold shadow-xl transition-transform hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                        boxShadow: `0 20px 40px -10px ${item.color}40`,
                      }}
                    >
                      <item.icon className="h-9 w-9" />
                    </div>
                  </div>
                  <span className="inline-block text-sm font-bold text-gray-400 mb-2">STEP {item.step}</span>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rank Tiers */}
      {/* Removed Rank Tiers Section */}

      {/* Testimonials */}
      {/* Removed Testimonials Section */}

      {/* CTA Section */}
      <section className="py-16 md:py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-16 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Ready to get started?</h2>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                Join thousands of participants already growing their network with FlowChain.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => router.push("/participant/register")}
                  className="h-14 px-10 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-full"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/leaderboard")}
                  className="h-14 px-8 text-lg font-semibold border-white/30 hover:bg-white/10 rounded-full text-[rgba(252,251,251,1)] bg-transparent"
                >
                  View Leaderboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Dialog */}
      <LearnMoreDialog open={showLearnMore} onOpenChange={setShowLearnMore} />

      {/* Footer */}
      <footer className="py-12 md:py-16 border-t border-gray-100 bg-gray-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <FlowChainLogo size="sm" showTagline={false} />
              <p className="text-gray-500 mt-4 text-sm leading-relaxed">
                The world's first platform that doubles your investment in 30 days with 24/7 support and guaranteed
                returns.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <a href="#how-it-works" className="hover:text-gray-900 transition-colors">
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="/leaderboard" className="hover:text-gray-900 transition-colors">
                    Leaderboard
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-emerald-600" />
                  <span className="font-medium text-emerald-600">24/7 Available</span>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">© 2026 FlowChain. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <Lock className="h-4 w-4" />
                SSL Secured
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                Bank-Grade Security
              </span>
              <span className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <Zap className="h-4 w-4" />
                2X Guaranteed
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chat Dialog */}
      <AIChatbotDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
      
      {/* Learn More Dialog */}
      <LearnMoreDialog open={showLearnMore} onOpenChange={setShowLearnMore} />
    </div>
  )
}
