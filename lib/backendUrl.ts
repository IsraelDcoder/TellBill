
const DEV_PORT = 3000;

export function getBackendUrl(): string {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    console.log("[Backend] Using production URL from environment");
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Custom IP from environment (for flexibility)
  if (process.env.EXPO_PUBLIC_BACKEND_IP) {
    const url = `http://${process.env.EXPO_PUBLIC_BACKEND_IP}:${DEV_PORT}`;
    console.log("[Backend] Using custom IP from environment:", url);
    return url;
  }

  const DEFAULT_IP = "localhost"; // Falls back to localhost if env var not set
  const url = `http://${DEFAULT_IP}:${DEV_PORT}`;
  console.log("[Backend] Using development URL:", url);
  return url;
}


export function getApiUrl(endpoint: string): string {
  const base = getBackendUrl();
  return `${base}${endpoint}`;
}

/**
 * ✅ CRITICAL: Shared revenue calculation
 * All screens must use this same function to ensure consistency
 * 
 * @param invoices - Array of invoices from store
 * @returns Total revenue in CENTS (integer) from paid invoices only
 * 
 * @example
 * const revenueCents = calculateTotalRevenue(invoices);
 * const formatted = formatCents(revenueCents); // "$3,600.00"
 */
export function calculateTotalRevenue(invoices: any[]): number {
  if (!Array.isArray(invoices)) {
    console.warn("[Revenue] ⚠️  invoices is not an array:", typeof invoices);
    return 0;
  }

  // ✅ RULE: Only sum paid invoices
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  
  const total = paidInvoices.reduce((sum, inv) => {
    // Safely add invoice total (in cents)
    const invoiceTotal = inv.total || 0;
    
    if (typeof invoiceTotal !== 'number') {
      console.warn(`[Revenue] ⚠️  Invoice ${inv.id} has non-numeric total:`, invoiceTotal);
      return sum;
    }
    
    return sum + invoiceTotal;
  }, 0);

  console.log(`[Revenue] ✅ Calculated total from ${paidInvoices.length} paid invoices: ${total} cents ($${(total / 100).toFixed(2)})`);
  
  return total;
}
