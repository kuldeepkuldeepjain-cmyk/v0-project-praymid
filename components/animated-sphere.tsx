"use client"

import React from "react"
import Image from "next/image"

export function AnimatedSphere() {
  return (
    <div className="relative h-full flex items-center justify-center">
      {/* Main container with animations */}
      <div className="relative w-full max-w-md h-96 lg:h-full lg:max-w-none flex items-center justify-center">
        {/* Animated background glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Outer glowing rings */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-400/20 animate-pulse" style={{ animationDuration: "3s" }}></div>
          <div className="absolute inset-8 rounded-full border-2 border-blue-400/15 animate-spin" style={{ animationDuration: "20s" }}></div>
          <div className="absolute inset-16 rounded-full border border-purple-300/10 animate-spin" style={{ animationDuration: "30s", animationDirection: "reverse" }}></div>
          
          {/* Central glow effect */}
          <div className="absolute inset-20 bg-gradient-to-br from-purple-300/30 via-blue-300/20 to-purple-300/10 rounded-full blur-3xl"></div>
        </div>

        {/* Sphere image container */}
        <div className="relative w-80 h-80 lg:w-96 lg:h-96 flex items-center justify-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/animation-ksZ5naX9mJn4xoLVXk3syjV8hitMTV.png"
            alt="FlowChain Sphere"
            width={400}
            height={400}
            className="w-full h-full object-contain drop-shadow-2xl"
            priority
          />
          
          {/* Floating animated particles around sphere */}
          <div className="absolute w-96 h-96 pointer-events-none">
            {/* Floating coin 1 - top left */}
            <div
              className="absolute w-12 h-12 flex items-center justify-center text-3xl animate-bounce"
              style={{
                top: "-30px",
                left: "-20px",
                animationDelay: "0s",
                animationDuration: "2s",
              }}
            >
              💚
            </div>

            {/* Floating coin 2 - top right */}
            <div
              className="absolute w-12 h-12 flex items-center justify-center text-3xl animate-bounce"
              style={{
                top: "20px",
                right: "-30px",
                animationDelay: "0.3s",
                animationDuration: "2s",
              }}
            >
              🔴
            </div>

            {/* Floating coin 3 - bottom left */}
            <div
              className="absolute w-12 h-12 flex items-center justify-center text-3xl animate-bounce"
              style={{
                bottom: "30px",
                left: "-40px",
                animationDelay: "0.6s",
                animationDuration: "2s",
              }}
            >
              ₿
            </div>

            {/* Floating coin 4 - bottom right */}
            <div
              className="absolute w-12 h-12 flex items-center justify-center text-3xl animate-bounce"
              style={{
                bottom: "20px",
                right: "-20px",
                animationDelay: "0.9s",
                animationDuration: "2s",
              }}
            >
              💰
            </div>

            {/* Additional small coins rotating around */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: "60s" }}>
              <div className="absolute top-0 left-1/2 text-2xl -translate-x-1/2">🪙</div>
              <div className="absolute right-0 top-1/2 text-2xl -translate-y-1/2">🏆</div>
              <div className="absolute bottom-0 left-1/2 text-2xl -translate-x-1/2">✨</div>
              <div className="absolute left-0 top-1/2 text-2xl -translate-y-1/2">⭐</div>
            </div>
          </div>
        </div>

        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" style={{ animationDuration: "3s" }}></div>

        {/* Light rays effect */}
        <div className="absolute inset-0 rounded-full opacity-50 pointer-events-none">
          <div className="absolute w-full h-full rounded-full" style={{
            background: "radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)",
            filter: "blur(40px)",
          }}></div>
          <div className="absolute w-full h-full rounded-full" style={{
            background: "radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
            filter: "blur(40px)",
          }}></div>
        </div>
      </div>
    </div>
  )
}
