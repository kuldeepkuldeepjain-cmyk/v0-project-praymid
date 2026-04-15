import type { Payment } from "./types"

export const mockPayments: Payment[] = [
  {
    id: "1",
    payment_id: "PAY_001",
    user_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    amount: 1000,
    status: "approved",
    chain: "BSC",
    created_at: "2024-01-15T10:30:00Z",
    approved_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "2",
    payment_id: "PAY_002",
    user_address: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    amount: 2500,
    status: "approved",
    chain: "ETH",
    created_at: "2024-01-16T14:20:00Z",
    approved_at: "2024-01-16T14:45:00Z",
  },
  {
    id: "3",
    payment_id: "PAY_003",
    user_address: "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
    amount: 500,
    status: "pending",
    chain: "BSC",
    created_at: "2024-01-17T09:15:00Z",
  },
  {
    id: "4",
    payment_id: "PAY_004",
    user_address: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
    amount: 3000,
    status: "collected",
    chain: "ETH",
    created_at: "2024-01-14T16:00:00Z",
    approved_at: "2024-01-14T16:30:00Z",
  },
  {
    id: "5",
    payment_id: "PAY_005",
    user_address: "0x1aD91ee08f21bE3dE0BA2ba6918E714dA6B45836",
    amount: 1500,
    status: "approved",
    chain: "BSC",
    created_at: "2024-01-18T12:00:00Z",
    approved_at: "2024-01-18T12:30:00Z",
  },
]

export const mockAllowances: Record<string, { balance: string; allowance: string; available: string }> = {
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb": {
    balance: "1000",
    allowance: "1000",
    available: "1000",
  },
  "0x8ba1f109551bD432803012645Ac136ddd64DBA72": {
    balance: "2500",
    allowance: "2500",
    available: "2500",
  },
  "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097": {
    balance: "500",
    allowance: "0",
    available: "0",
  },
  "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5": {
    balance: "0",
    allowance: "0",
    available: "0",
  },
  "0x1aD91ee08f21bE3dE0BA2ba6918E714dA6B45836": {
    balance: "1500",
    allowance: "1500",
    available: "1500",
  },
}
