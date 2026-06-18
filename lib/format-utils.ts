/**
 * Mask a mobile number to show only the last 4 digits
 * Example: "+1 (555) 123-4567" -> "****4567"
 */
export function maskMobileNumber(mobileNumber: string | null | undefined): string {
  if (!mobileNumber) return "Not provided"
  
  // Extract only digits
  const digits = mobileNumber.replace(/\D/g, "")
  
  // If less than 4 digits, just show asterisks
  if (digits.length < 4) {
    return "****"
  }
  
  // Show last 4 digits with asterisks for the rest
  const lastFour = digits.slice(-4)
  return `****${lastFour}`
}
