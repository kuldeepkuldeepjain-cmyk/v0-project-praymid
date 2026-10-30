import type { Metadata } from "next"
import { EliteFundUpiGateway } from "@/components/elitefund-upi-gateway"

export const metadata: Metadata = {
  title: "EliteFund UPI Gateway | Add Funds",
  description:
    "Collect funds into your EliteFund wallet with UPI. Scan the QR, pay the exact INR amount, and confirm the UTR reference for verification.",
}

export default function EliteFundUpiPage() {
  return <EliteFundUpiGateway />
}
