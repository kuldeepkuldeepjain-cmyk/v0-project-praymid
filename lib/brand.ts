// FlowChain Brand System
// A strict, clear, and future-proof brand guide for premium enterprise SaaS

export const brand = {
  // Core Identity
  name: "FlowChain",
  tagline: "A Structured Participation Network",

  // Brand Purpose
  purpose: "To provide a controlled, transparent participation system with clear structure and accountability.",

  // Brand Personality Traits
  personality: ["Calm", "Intelligent", "Authoritative", "Transparent", "Reserved"] as const,

  // Voice Characteristics
  voice: {
    characteristics: ["Professional", "Neutral", "Confident", "Clear", "Non-promotional"] as const,
    tone: {
      rules: ["Informative, not persuasive", "Reassuring, not exciting", "Direct, not verbose"],
    },
    // Approved language
    allowedTerms: ["Contribution", "Participation", "Verification", "Reward Balance", "Status", "Network"],
    // Forbidden language - NEVER use these
    forbiddenTerms: ["Earn", "Profit", "Investment", "Guaranteed", "Double", "Fast money", "Passive income"],
  },

  // Strict Color System (Non-negotiable)
  colors: {
    // Primary: Obsidian Night - Main background, depth, authority
    obsidianNight: "#0B0C10",

    // Secondary: Gunmetal Blue - Cards, panels, containers
    gunmetalBlue: "#1F2833",

    // Accent 1: Liquid Gold - Primary actions and key highlights ONLY (use sparingly)
    liquidGold: "#C5A059",

    // Accent 2: Platinum Mist - Borders, dividers, icons, subtle UI elements
    platinumMist: "#C0C0C0",

    // Typography: Soft Ivory - Primary typography, high readability
    softIvory: "#E5E5E5",

    // Semantic colors
    success: "#10B981",
    warning: "#F59E0B",
    destructive: "#DC2626",
    info: "#3B82F6",
  },

  // Typography
  typography: {
    primary: "Inter",
    fallback: "system-ui, sans-serif",
    principles: ["High readability", "Clean hierarchy", "Calm appearance"],
    usage: {
      headings: "Medium to Semi-Bold",
      body: "Regular",
    },
    forbidden: ["Decorative fonts", "Script fonts", "Futuristic gimmicks"],
  },

  // UI Principles
  ui: {
    principles: ["Simplicity", "Clarity", "Structure", "Consistency"],
    layout: {
      style: "Card-based UI",
      spacing: "Generous",
      alignment: "Clear",
      hierarchy: "Strong information hierarchy",
    },
    avoid: ["Visual clutter", "Dense layouts", "Over-decoration"],
  },

  // Motion Guidelines
  motion: {
    philosophy: ["Subtle", "Purposeful", "Calm"],
    timing: {
      min: 150,
      max: 200,
      easing: "ease-out",
    },
    rules: ["Use micro-interactions only", "Respect reduced-motion preferences"],
    forbidden: ["Bounce animations", "Flashy effects", "Attention-grabbing motion"],
  },

  // Quality Benchmark - Should feel at home next to:
  benchmark: ["Stripe", "Linear", "Vercel", "OpenAI", "Notion"],

  // Brand Enforcement Rules
  enforcement: {
    rejectIf: ["Feels promotional", "Feels trendy", "Feels flashy", "Feels manipulative"],
    goal: "This is a serious, structured, long-term platform.",
  },
} as const

export type BrandColor = keyof typeof brand.colors
export type BrandPersonality = (typeof brand.personality)[number]
