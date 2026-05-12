"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isParticipantAuthenticated } from "@/lib/auth"

export default function ParticipantDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    
    const authEmail = isParticipantAuthenticated()
    if (!authEmail) {
      router.push("/participant/login")
      return
    }
    
    setEmail(authEmail)
  }, [router])

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Participant Dashboard (Test)</h1>
      <p>Logged in as: {email}</p>
      <p className="mt-4 text-green-600">If you see this, the basic page works!</p>
    </div>
  )
}
