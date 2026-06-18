'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, Bell } from 'lucide-react'

interface Notice {
  id: string
  title: string
  message: string
  icon?: string
  type: 'info' | 'success' | 'warning' | 'alert'
}

const DEFAULT_NOTICES: Notice[] = [
  {
    id: '1',
    title: 'Flowchain Coin Listing',
    message: 'Get ready! Flowchain coin is launching on major exchanges very soon. Stake now to earn bonus rewards.',
    icon: '🚀',
    type: 'success',
  },
  {
    id: '2',
    title: 'New Staking Feature Live',
    message: 'Start staking with just $10 minimum and earn 8-15% APY on your Flowchain holdings.',
    icon: '⚡',
    type: 'success',
  },
  {
    id: '3',
    title: 'Direct Withdrawal Available',
    message: 'Reach $300 balance to unlock Direct Withdrawal feature and get instant access to your winnings.',
    icon: '💰',
    type: 'info',
  },
  {
    id: '4',
    title: 'Referral Rewards Doubled',
    message: 'Invite your friends and earn $5 for each successful referral. More friends = More rewards!',
    icon: '🎁',
    type: 'success',
  },
  {
    id: '5',
    title: 'Daily Spin Wheel Update',
    message: 'Check back daily! Increased winning odds this week. Your next spin could be the jackpot.',
    icon: '🎰',
    type: 'alert',
  },
]

export function NoticeBoard() {
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const notices = DEFAULT_NOTICES

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentNoticeIndex((prev) => (prev + 1) % notices.length)
        setIsTransitioning(false)
      }, 300)
    }, 5000)

    return () => clearInterval(timer)
  }, [notices.length])

  const currentNotice = notices[currentNoticeIndex]

  const typeStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
    alert: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-700',
    },
  }

  const style = typeStyles[currentNotice.type]

  return (
    <div className={`${style.bg} border-t-2 ${style.border} px-4 py-3 sm:px-6 sm:py-4`}>
      <div className="max-w-7xl mx-auto">
        {/* Desktop View */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Bell className={`h-5 w-5 ${style.icon} flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <div className={`opacity-${isTransitioning ? 50 : 100} transition-opacity duration-300`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold">{currentNotice.icon}</span>
                  <h3 className={`text-sm sm:text-base font-bold ${style.text}`}>
                    {currentNotice.title}
                  </h3>
                </div>
                <p className={`text-xs sm:text-sm ${style.text} line-clamp-1`}>
                  {currentNotice.message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1">
              {notices.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsTransitioning(true)
                    setTimeout(() => {
                      setCurrentNoticeIndex(idx)
                      setIsTransitioning(false)
                    }, 300)
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentNoticeIndex
                      ? `${style.badge} w-8`
                      : `${style.badge} w-2 opacity-40`
                  }`}
                  aria-label={`Go to notice ${idx + 1}`}
                />
              ))}
            </div>
            <ChevronRight className={`h-5 w-5 ${style.icon}`} />
          </div>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xl flex-shrink-0">{currentNotice.icon}</span>
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm font-bold ${style.text}`}>
                {currentNotice.title}
              </h3>
            </div>
          </div>
          <p className={`text-xs ${style.text} ml-9 mb-3`}>
            {currentNotice.message}
          </p>
          <div className="flex gap-1 ml-9">
            {notices.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsTransitioning(true)
                  setTimeout(() => {
                    setCurrentNoticeIndex(idx)
                    setIsTransitioning(false)
                  }, 300)
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentNoticeIndex
                    ? `${style.badge} w-6`
                    : `${style.badge} w-1.5 opacity-40`
                }`}
                aria-label={`Go to notice ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
