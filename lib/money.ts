/**
 * ✅ CRITICAL: Centralized money utility for TellBill
 * 
 * RULE: All amounts are stored and transmitted as CENTS (integer)
 * - Client → Server: amounts in cents
 * - DB: all amounts in cents as numeric fields
 * - Server → Client: amounts in cents  
 * - Display: divide by 100 and format as currency
 * 
 * Examples:
 * - 360000 cents = $3,600.00
 * - 5000 cents = $50.00
 * - 100 cents = $1.00
 */

/**
 * Convert major units (dollars) to minor units (cents)
 * @param dollars - Amount in dollars (can be string or number)
 * @returns Amount in cents as integer
 * 
 * @example
 * toMinorUnits(20.02) // → 2002
 * toMinorUnits("50.50") // → 5050
 * toMinorUnits(3600) // → 360000 (if already multiplied, catches the error in testing)
 */
export function toMinorUnits(dollars: number | string | undefined | null): number {
  if (!dollars && dollars !== 0) return 0;
  const value = typeof dollars === "string" ? parseFloat(dollars) : (dollars || 0);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

/**
 * Convert minor units (cents) to major units (dollars)
 * @param cents - Amount in cents (can be string or number)
 * @returns Amount in dollars as number
 * 
 * @example
 * toMajorUnits(2002) // → 20.02
 * toMajorUnits("360000") // → 3600
 * toMajorUnits(5000) // → 50
 */
export function toMajorUnits(cents: number | string | undefined | null): number {
  if (!cents && cents !== 0) return 0;
  const value = typeof cents === "string" ? parseFloat(cents) : (cents || 0);
  if (isNaN(value)) return 0;
  return value / 100;
}

/**
 * Format cents as USD currency string
 * ✅ PRIMARY FORMATTING FUNCTION - Use this everywhere
 * @param cents - Amount in cents (number, string, or undefined)
 * @returns Formatted currency string (e.g., "$3,600.00")
 * 
 * @example
 * formatCents(360000) // → "$3,600.00"
 * formatCents("360000") // → "$3,600.00"
 * formatCents(0) // → "$0.00"
 * formatCents(undefined) // → "$0.00"
 */
export function formatCents(cents: number | string | undefined | null): string {
  if (cents === null || cents === undefined) {
    return "$0.00";
  }

  let amount = typeof cents === "string" ? parseFloat(cents) : cents;
  if (isNaN(amount)) {
    return "$0.00";
  }

  // Divide by 100 to get dollars, then format
  const dollars = amount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * ⚠️ DEPRECATED: Use formatCents instead
 * Kept for backward compatibility during migration
 */
export function formatCurrency(amountInCents: number | string | undefined | null): string {
  return formatCents(amountInCents);
}

/**
 * ⚠️ DEPRECATED: Use toMinorUnits instead
 * Kept for backward compatibility during migration
 */
export function dollarsToCents(dollars: number | string | undefined): number {
  return toMinorUnits(dollars);
}

/**
 * Calculate labor total in cents
 * ✅ CRITICAL: Labor rate is already in cents, do NOT multiply by 100
 * @param hours - Number of hours worked
 * @param rateInCents - Hourly rate in cents (e.g., 3600 for $36/hr)
 * @returns Total in cents
 * 
 * @example
 * calculateLaborTotal(10, 3600) // → 36000 cents ($360.00)
 * calculateLaborTotal(100, 3600) // → 360000 cents ($3,600.00)
 */
export function calculateLaborTotal(hours: number, rateInCents: number): number {
  if (!hours || !rateInCents) return 0;
  // ✅ CRITICAL: rateInCents is already in cents, NO additional *100
  return Math.round(hours * rateInCents);
}

/**
 * Calculate total with tax
 * ✅ All amounts in cents
 * @param subtotalCents - Subtotal in cents
 * @param taxRatePercent - Tax rate as percentage (e.g., 7.5 for 7.5%)
 * @returns Object with taxAmount and total in cents
 * 
 * @example
 * calculateTotalWithTax(10000, 7.5)
 * // → { taxAmount: 750, total: 10750 }
 */
export function calculateTotalWithTax(
  subtotalCents: number,
  taxRatePercent: number
): { taxAmount: number; total: number } {
  if (!subtotalCents || !taxRatePercent) {
    return { taxAmount: 0, total: subtotalCents || 0 };
  }
  const taxAmount = Math.round((subtotalCents * taxRatePercent) / 100);
  const total = subtotalCents + taxAmount;
  return { taxAmount, total };
}

/**
 * Validate money amount (catches errors)
 * @param amount - Amount to validate
 * @returns true if amount is a valid number >= 0
 */
export function isValidMoney(amount: any): boolean {
  if (amount === null || amount === undefined) return true; // null/undefined OK (defaults to 0)
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return !isNaN(num) && num >= 0;
}

/**
 * Round amount to cents (prevents floating point errors)
 * @param amount - Amount in cents
 * @returns Rounded amount
 */
export function roundToCents(amount: number): number {
  return Math.round(amount);
}

/**
 * ✅ CRITICAL: Calculate total revenue from invoices
 * MUST be used everywhere for consistency
 * 
 * @param invoices - Array of invoices from store
 * @returns Total revenue in CENTS (integer) from PAID invoices only
 * 
 * @example
 * const revenueCents = calculateTotalRevenue(invoices);
 * const formatted = formatCents(revenueCents); // "$3,600.00"
 * 
 * RULE: Never calculate revenue differently in different screens
 * RULE: Only sum invoices with status === 'paid'
 * RULE: Always return amount in CENTS
 */
export function calculateTotalRevenue(invoices: any[]): number {
  if (!Array.isArray(invoices)) {
    console.warn("[Revenue] ⚠️  invoices is not an array:", typeof invoices);
    return 0;
  }

  // ✅ RULE: Only sum paid invoices
  const paidInvoices = invoices.filter(inv => inv?.status === 'paid');
  
  const total = paidInvoices.reduce((sum, inv) => {
    // Safely add invoice total (in cents)
    const invoiceTotal = inv.total || 0;
    
    if (typeof invoiceTotal !== 'number') {
      console.warn(`[Revenue] ⚠️  Invoice ${inv.id} has non-numeric total:`, invoiceTotal);
      return sum;
    }
    
    // ✅ Always work with integer cents
    return sum + Math.round(invoiceTotal);
  }, 0);

  console.log(`[Revenue] ✅ Calculated total from ${paidInvoices.length} paid invoices: ${total} cents ($${(total / 100).toFixed(2)})`);
  
  return total;
}
