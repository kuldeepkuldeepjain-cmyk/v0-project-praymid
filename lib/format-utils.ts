/**
 * Currency conversion: 1 USD = 100 INR
 */
const DOLLAR_TO_RUPEES_RATE = 100

/**
 * Convert dollars to rupees
 * @param dollars Amount in dollars
 * @returns Amount in rupees
 */
export function convertDollarToRupees(dollars: number): number {
  return dollars * DOLLAR_TO_RUPEES_RATE
}

/**
 * Format amount as rupees with RS symbol
 * @param amount Amount in dollars
 * @param decimals Number of decimal places
 * @returns Formatted string like "₹10,000.00" or "RS 10,000.00"
 */
export function formatRupees(amount: number, decimals: number = 2): string {
  const rupees = convertDollarToRupees(amount)
  return `₹${rupees.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/**
 * Format amount as rupees without decimals
 * @param amount Amount in dollars
 * @returns Formatted string like "₹10,000"
 */
export function formatRupeesShort(amount: number): string {
  const rupees = convertDollarToRupees(amount)
  return `₹${Math.round(rupees).toLocaleString()}`
}

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
