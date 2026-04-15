import type { UserRole } from "./types"

// Admin authentication
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  const token = localStorage.getItem("admin_token")
  return !!token
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("admin_token")
}

export function setAdminAuth(
  token: string,
  email: string,
  role: "admin" | "super_admin" = "super_admin",
  permissions?: {
    canApproveWallets: boolean
    canViewAllActivity: boolean
    canFreezeAccounts: boolean
    canManageAdmins: boolean
    canAccessDatabase: boolean
  },
) {
  if (typeof window === "undefined") return
  localStorage.setItem("admin_token", token)
  localStorage.setItem("admin_email", email)
  localStorage.setItem("admin_role", role)
  if (permissions) {
    localStorage.setItem("admin_permissions", JSON.stringify(permissions))
  }
}

export function clearAdminAuth() {
  if (typeof window === "undefined") return
  localStorage.removeItem("admin_token")
  localStorage.removeItem("admin_email")
  localStorage.removeItem("admin_role")
  localStorage.removeItem("admin_permissions")
  // Also clear the httpOnly session cookie via the API
  fetch("/api/auth/admin-logout", { method: "POST" }).catch(() => {})
}

export function getAdminData(): {
  email: string
  role: string
  permissions?: {
    canApproveWallets: boolean
    canViewAllActivity: boolean
    canFreezeAccounts: boolean
    canManageAdmins: boolean
    canAccessDatabase: boolean
  }
} | null {
  if (typeof window === "undefined") return null
  const email = localStorage.getItem("admin_email")
  const role = localStorage.getItem("admin_role")
  const permissionsStr = localStorage.getItem("admin_permissions")
  if (!email || !role) return null

  let permissions
  if (permissionsStr) {
    try {
      permissions = JSON.parse(permissionsStr)
    } catch (e) {
      permissions = undefined
    }
  }

  return { email, role, permissions }
}

export function isSuperAdmin(): boolean {
  if (typeof window === "undefined") return false
  const role = localStorage.getItem("admin_role")
  return role === "super_admin"
}

// Participant authentication
export function isParticipantAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  const token = sessionStorage.getItem("participant_token")
  const wallet = sessionStorage.getItem("participant_wallet")
  return !!(token && wallet)
}

export function getParticipantToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("participant_token")
}

export function setParticipantAuth(
  token: string,
  walletAddress: string,
  email?: string,
  username?: string,
  name?: string,
  activation_fee_paid?: boolean,
  created_at?: string,
  is_frozen?: boolean,
) {
  if (typeof window === "undefined") return
  sessionStorage.setItem("participant_token", token)
  sessionStorage.setItem("participant_wallet", walletAddress)
  if (email) sessionStorage.setItem("participant_email", email)
  if (username) sessionStorage.setItem("participant_username", username)
  if (name) sessionStorage.setItem("participant_name", name)
  sessionStorage.setItem("participant_activation_fee_paid", String(activation_fee_paid || false))
  if (created_at) sessionStorage.setItem("participant_created_at", created_at)
  sessionStorage.setItem("participant_is_frozen", String(is_frozen || false))
}

export function clearParticipantAuth() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("participant_token")
  sessionStorage.removeItem("participant_wallet")
  sessionStorage.removeItem("participant_email")
  sessionStorage.removeItem("participant_username")
  sessionStorage.removeItem("participant_name")
  sessionStorage.removeItem("participant_activation_fee_paid")
  sessionStorage.removeItem("participant_created_at")
  sessionStorage.removeItem("participant_is_frozen")
  localStorage.removeItem("participantData")
  localStorage.removeItem("participantToken")
  // Also clear the httpOnly session cookie via the API
  fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
}

export function getParticipantData(): {
  wallet: string
  email?: string
  username?: string
  name?: string
  activation_fee_paid?: boolean
  created_at?: string
  is_frozen?: boolean
} | null {
  if (typeof window === "undefined") return null
  const wallet = sessionStorage.getItem("participant_wallet")
  const email = sessionStorage.getItem("participant_email") || undefined
  const username = sessionStorage.getItem("participant_username") || undefined
  const name = sessionStorage.getItem("participant_name") || undefined
  const activation_fee_paid = sessionStorage.getItem("participant_activation_fee_paid") === "true"
  const created_at = sessionStorage.getItem("participant_created_at") || undefined
  const is_frozen = sessionStorage.getItem("participant_is_frozen") === "true"

  if (!wallet) return null
  return { wallet, email, username, name, activation_fee_paid, created_at, is_frozen }
}

// Role checking
export function getUserRole(): UserRole | null {
  if (typeof window === "undefined") return null

  if (isAdminAuthenticated()) {
    const role = localStorage.getItem("admin_role")
    return role === "super_admin" ? "super_admin" : "admin"
  }

  if (isParticipantAuthenticated()) {
    return "participant"
  }

  return null
}
