/**
 * Invoice Utility Functions
 * Real-time computed properties for invoice state without database queries
 */

interface Invoice {
  dueDate: string | Date;
  status: string;
  paidAt: string | null | undefined;
}

/**
 * Check if an invoice is overdue
 * An invoice is overdue when:
 * - Status is "sent" (has been sent to client)
 * - Today is past the due date
 * - Invoice has not been paid (paidAt is null/empty)
 * 
 * @param invoice - Invoice object with dueDate, status, paidAt
 * @param now - Current date for comparison (defaults to now)
 * @returns true if invoice is overdue, false otherwise
 */
export function isOverdue(invoice: Invoice, now: Date = new Date()): boolean {
  if (!invoice.dueDate || invoice.status !== "sent" || invoice.paidAt) {
    return false;
  }

  try {
    const dueDate = new Date(invoice.dueDate);
    return now > dueDate;
  } catch {
    return false;
  }
}

/**
 * Get the number of days an invoice is overdue
 * Returns 0 if not overdue
 * 
 * @param invoice - Invoice object with dueDate, status, paidAt
 * @param now - Current date for comparison
 * @returns Number of days overdue (0 if not overdue)
 */
export function getDaysOverdue(invoice: Invoice, now: Date = new Date()): number {
  if (!isOverdue(invoice, now)) {
    return 0;
  }

  try {
    const dueDate = new Date(invoice.dueDate);
    const diffMs = now.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}
