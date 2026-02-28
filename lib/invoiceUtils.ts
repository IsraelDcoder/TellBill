/**
 * Invoice utility functions for calculating overdue status and days
 */

export interface InvoiceData {
  dueDate: Date | string | null;
  paidAt: Date | string | null;
  status: string;
}

/**
 * Calculate if an invoice is overdue
 * Overdue = Status is "sent" AND Today > DueDate AND Not paid
 * @param invoice - Invoice object with dueDate, paidAt, and status
 * @returns true if invoice is overdue, false otherwise
 */
export function isOverdue(invoice: InvoiceData): boolean {
  if (!invoice.dueDate) return false;
  if (invoice.status !== "sent") return false;
  if (invoice.paidAt) return false; // Already paid

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return today > dueDate;
}

/**
 * Calculate how many days overdue an invoice is
 * Returns 0 if not overdue
 * @param invoice - Invoice object with dueDate and paidAt
 * @returns Number of days overdue
 */
export function daysOverdue(invoice: InvoiceData): number {
  if (!isOverdue(invoice)) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(invoice.dueDate!);
  dueDate.setHours(0, 0, 0, 0);

  const diff = today.getTime() - dueDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get human-readable overdue status
 * @param invoice - Invoice object
 * @returns Status text like "5 days overdue" or empty string if not overdue
 */
export function getOverdueText(invoice: InvoiceData): string {
  const days = daysOverdue(invoice);
  if (days === 0) return "";
  if (days === 1) return "1 day overdue";
  return `${days} days overdue`;
}

/**
 * Check if invoice should be highlighted as overdue in UI
 * @param invoice - Invoice object
 * @returns true if invoice should show overdue styling
 */
export function shouldShowOverdueWarning(invoice: InvoiceData): boolean {
  return isOverdue(invoice);
}
