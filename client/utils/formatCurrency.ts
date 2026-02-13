/**
 * Standardized currency formatter for TellBill
 * 
 * IMPORTANT: All amounts in the app should be stored/passed as CENTS (number)
 * This utility converts cents to USD display format
 * 
 * Examples:
 * - formatCurrency(200200) → "$2,002.00"
 * - formatCurrency(5000) → "$50.00"
 * - formatCurrency(0) → "$0.00"
 */

export const formatCurrency = (amountInCents: number | string | undefined | null): string => {
  // Handle null/undefined
  if (amountInCents === null || amountInCents === undefined) {
    return "$0.00";
  }

  // Convert to number if string
  let cents = typeof amountInCents === "string" ? parseFloat(amountInCents) : amountInCents;

  // Handle NaN
  if (isNaN(cents)) {
    return "$0.00";
  }

  // Convert cents to dollars and format
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
};

/**
 * Parse user input (dollars) to cents for storage/API calls
 * Examples:
 * - dollarsToCents(20.02) → 2002
 * - dollarsToCents("50.50") → 5050
 */
export const dollarsToCents = (dollars: number | string | undefined): number => {
  if (!dollars) return 0;
  const value = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
};

/**
 * Format for display in tables/lists - shortened version
 * Examples:
 * - formatCurrencyShort(200200) → "$2,002"
 * - formatCurrencyShort(5000) → "$50"
 */
export const formatCurrencyShort = (amountInCents: number | string | undefined | null): string => {
  const formatted = formatCurrency(amountInCents);
  // Remove the .00 for display if it's a whole dollar amount
  return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
};
