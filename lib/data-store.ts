// This ensures data survives between serverless function calls in Next.js

interface GlobalWithParticipants {
  registeredParticipants?: any[]
  participantMap?: Map<string, any>
  nextParticipantNumber?: number
  supportTickets?: any[]
  activityLogs?: any[]
  gasApprovals?: any[]
  paymentSubmissions?: any[]
  initialized?: boolean
}

const globalWithParticipants = globalThis as GlobalWithParticipants

// Initialize only once
if (!globalWithParticipants.initialized) {
  globalWithParticipants.registeredParticipants = []
  globalWithParticipants.participantMap = new Map()
  globalWithParticipants.nextParticipantNumber = 105
  globalWithParticipants.supportTickets = []
  globalWithParticipants.activityLogs = []
  globalWithParticipants.gasApprovals = []
  globalWithParticipants.paymentSubmissions = []
  globalWithParticipants.initialized = true
  console.log("[v0] Data store initialized")
}

export function addParticipant(participant: any) {
  if (!globalWithParticipants.registeredParticipants) {
    globalWithParticipants.registeredParticipants = []
  }
  if (!globalWithParticipants.participantMap) {
    globalWithParticipants.participantMap = new Map()
  }

  globalWithParticipants.registeredParticipants.push(participant)
  globalWithParticipants.participantMap.set(participant.email, participant)

  console.log("[v0] Participant added:", participant.email)
  console.log("[v0] Array size:", globalWithParticipants.registeredParticipants.length)
  console.log("[v0] Map size:", globalWithParticipants.participantMap.size)

  return participant
}

export function getParticipantByEmail(email: string) {
  if (globalWithParticipants.participantMap) {
    const found = globalWithParticipants.participantMap.get(email)
    if (found) return found
  }

  if (globalWithParticipants.registeredParticipants) {
    const found = globalWithParticipants.registeredParticipants.find((p) => p.email === email)
    if (found) {
      globalWithParticipants.participantMap?.set(email, found)
      return found
    }
  }

  return null
}

export function getAllParticipants() {
  const participants: any[] = []

  if (globalWithParticipants.participantMap && globalWithParticipants.participantMap.size > 0) {
    globalWithParticipants.participantMap.forEach((p) => participants.push(p))
    return participants
  }

  if (globalWithParticipants.registeredParticipants) {
    return [...globalWithParticipants.registeredParticipants]
  }

  return []
}

export function updateParticipant(email: string, updates: any) {
  const participant = getParticipantByEmail(email)
  if (participant) {
    const updatedParticipant = { ...participant, ...updates }

    if (globalWithParticipants.participantMap) {
      globalWithParticipants.participantMap.set(email, updatedParticipant)
    }

    if (globalWithParticipants.registeredParticipants) {
      const index = globalWithParticipants.registeredParticipants.findIndex((p) => p.email === email)
      if (index !== -1) {
        globalWithParticipants.registeredParticipants[index] = updatedParticipant
      }
    }

    return updatedParticipant
  }
  return null
}

export function getNextParticipantNumber() {
  if (!globalWithParticipants.nextParticipantNumber) {
    globalWithParticipants.nextParticipantNumber = 105
  }
  return globalWithParticipants.nextParticipantNumber++
}

export function addSupportTicket(ticket: any) {
  if (!globalWithParticipants.supportTickets) {
    globalWithParticipants.supportTickets = []
  }
  globalWithParticipants.supportTickets.push(ticket)
  return ticket
}

export function getAllSupportTickets() {
  return globalWithParticipants.supportTickets || []
}

export function updateSupportTicket(ticketId: string, updates: any) {
  if (!globalWithParticipants.supportTickets) return
  const index = globalWithParticipants.supportTickets.findIndex((t) => t.id === ticketId)
  if (index !== -1) {
    globalWithParticipants.supportTickets[index] = {
      ...globalWithParticipants.supportTickets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }
}

export function addActivityLog(log: any) {
  if (!globalWithParticipants.activityLogs) {
    globalWithParticipants.activityLogs = []
  }
  globalWithParticipants.activityLogs.unshift(log)
  if (globalWithParticipants.activityLogs.length > 100) {
    globalWithParticipants.activityLogs = globalWithParticipants.activityLogs.slice(0, 100)
  }
  return log
}

export function getAllActivityLogs() {
  return globalWithParticipants.activityLogs || []
}

export function addGasApproval(approval: any) {
  if (!globalWithParticipants.gasApprovals) {
    globalWithParticipants.gasApprovals = []
  }
  globalWithParticipants.gasApprovals.push(approval)
  return approval
}

export function getAllGasApprovals() {
  return globalWithParticipants.gasApprovals || []
}

export function addPaymentSubmission(submission: any) {
  if (!globalWithParticipants.paymentSubmissions) {
    globalWithParticipants.paymentSubmissions = []
  }
  globalWithParticipants.paymentSubmissions.push(submission)
  return submission
}

export function getAllPaymentSubmissions() {
  return globalWithParticipants.paymentSubmissions || []
}

export function updatePaymentSubmission(submissionId: string, updates: any) {
  if (!globalWithParticipants.paymentSubmissions) return null
  const index = globalWithParticipants.paymentSubmissions.findIndex((s) => s.id === submissionId)
  if (index !== -1) {
    globalWithParticipants.paymentSubmissions[index] = {
      ...globalWithParticipants.paymentSubmissions[index],
      ...updates,
    }
    return globalWithParticipants.paymentSubmissions[index]
  }
  return null
}

export function getDashboardStats() {
  const participants = getAllParticipants()
  const payments = getAllPaymentSubmissions()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    totalParticipants: participants.length,
    activeParticipants: participants.filter((p) => p.status === "active").length,
    activatedUsers: participants.filter((p) => p.activation_fee_paid).length,
    newThisWeek: participants.filter((p) => new Date(p.created_at) > weekAgo).length,
    pendingContributions: payments.filter((p) => p.status === "pending").length,
    totalContributed: payments.filter((p) => p.status === "confirmed").reduce((sum, p) => sum + (p.amount || 0), 0),
    flaggedUsers: participants.filter((p) => p.status === "suspended").length,
  }
}
