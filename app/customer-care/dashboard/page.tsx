"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CustomerCareWorkspace } from "@/components/customer-care-workspace"
import { clearAdminAuth, getAdminData, isAdminAuthenticated } from "@/lib/auth"

export default function CustomerCareDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const data = getAdminData()
    if (!isAdminAuthenticated() || data?.role !== "customer_care") {
      router.replace("/finalflow/login")
    }
  }, [router])

  return <CustomerCareWorkspace onLogout={() => { clearAdminAuth(); router.replace("/finalflow/login") }} />
}
