export function buildUpiPaymentUri(upiId: string | null, payeeName: string | null, amountInr: number): string | null {
  const vpa = upiId?.trim()
  if (!vpa || !/^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(vpa)) return null
  if (!Number.isFinite(amountInr) || amountInr <= 0 || amountInr > 1_000_000_000) return null
  const amount = amountInr.toFixed(2)
  if (Number(amount) <= 0) return null

  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName?.trim() || "EliteFund",
    am: amount,
    cu: "INR",
    tn: "EliteFund Add Funds",
  })
  return `upi://pay?${params.toString()}`
}
