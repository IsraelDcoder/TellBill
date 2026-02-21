import { db } from "../db";
import { invoices, users } from "@shared/schema";
import { eq, and, isNull, lte, gte, ne } from "drizzle-orm";
import { sendReminderEmail } from "../emailService";

/**
 * Invoice Reminders Service
 * Sends payment reminders to users for invoices due soon
 */

interface ReminderConfig {
  daysBeforeDue: number; // Send reminder N days before due date (default: 2)
  onlyUnpaid: boolean; // Only remind for unpaid invoices (default: true)
}

const DEFAULT_CONFIG: ReminderConfig = {
  daysBeforeDue: 2,
  onlyUnpaid: true,
};

/**
 * Check for invoices that need reminders and send them
 * @param config Configuration for reminder checks
 */
export async function sendDueInvoiceReminders(
  config: ReminderConfig = DEFAULT_CONFIG
): Promise<{ sent: number; errors: number }> {
  console.log(
    `[Reminders] 🔔 Starting invoice reminder check (sending reminders for invoices due in ${config.daysBeforeDue} days)`
  );

  let sentCount = 0;
  let errorCount = 0;

  try {
    // Calculate the date range
    const now = new Date();
    const checkInDays = new Date(now.getTime() + config.daysBeforeDue * 24 * 60 * 60 * 1000);
    const checkInDaysEnd = new Date(checkInDays.getTime() + 24 * 60 * 60 * 1000); // Include all of that day

    console.log(
      `[Reminders] Looking for invoices due between ${checkInDays.toISOString()} and ${checkInDaysEnd.toISOString()}`
    );

    // Query invoices that need reminders:
    // 1. Due date within the target window
    // 2. Not yet paid (if onlyUnpaid is true)
    // 3. Not yet reminded (reminderSentAt is NULL)
    // 4. Not in draft status (already sent)

    let query = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        clientEmail: invoices.clientEmail,
        total: invoices.total,
        dueDate: invoices.dueDate,
        userId: invoices.userId,
      })
      .from(invoices)
      .where(
        and(
          // Due date is in the target range
          gte(invoices.dueDate, checkInDays),
          lte(invoices.dueDate, checkInDaysEnd),
          // Reminder not yet sent
          isNull(invoices.reminderSentAt),
          // Status is not draft
          ne(invoices.status, "draft")
        )
      );

    // Only unpaid invoices if configured
    if (config.onlyUnpaid) {
      query = db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientName: invoices.clientName,
          clientEmail: invoices.clientEmail,
          total: invoices.total,
          dueDate: invoices.dueDate,
          userId: invoices.userId,
        })
        .from(invoices)
        .where(
          and(
            gte(invoices.dueDate, checkInDays),
            lte(invoices.dueDate, checkInDaysEnd),
            isNull(invoices.reminderSentAt),
            ne(invoices.status, "draft"),
            isNull(invoices.paidAt) // Not yet paid
          )
        );
    }

    const invoicesToRemind = await query;

    console.log(
      `[Reminders] Found ${invoicesToRemind.length} invoices that need reminders`
    );

    // Send reminders for each invoice
    for (const invoice of invoicesToRemind) {
      try {
        // Fetch user details for the invoice creator
        const invoiceUser = await db
          .select()
          .from(users)
          .where(eq(users.id, invoice.userId!))
          .limit(1);

        if (!invoiceUser || invoiceUser.length === 0) {
          console.warn(`[Reminders] ⚠️  User not found for invoice ${invoice.id}`);
          errorCount++;
          continue;
        }

        const user = invoiceUser[0];

        // Send reminder email to invoice creator
        await sendReminderEmail(
          user.email,
          {
            invoiceNumber: invoice.invoiceNumber || invoice.id,
            clientName: invoice.clientName || "Client",
            amount: invoice.total?.toString() || "0",
            dueDate: invoice.dueDate?.toISOString() || new Date().toISOString(),
          }
        );

        // Update the invoice to mark reminder as sent
        await db
          .update(invoices)
          .set({ reminderSentAt: new Date() })
          .where(eq(invoices.id, invoice.id));

        sentCount++;
        console.log(
          `[Reminders] ✅ Reminder sent for invoice ${invoice.invoiceNumber} to ${user.email}`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `[Reminders] ❌ Failed to send reminder for invoice ${invoice.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `[Reminders] ✅ Reminder check complete: ${sentCount} sent, ${errorCount} errors`
    );
    return { sent: sentCount, errors: errorCount };
  } catch (error) {
    console.error("[Reminders] ❌ Unhandled error during reminder check:", error);
    return { sent: sentCount, errors: errorCount + 1 };
  }
}

//
// ✅ Overdue Invoice Reminders (optional - for invoices past due)
// Sends reminder to invoice creator about overdue payments
//

export async function sendOverdueInvoiceReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  console.log(`[Reminders] 🔔 Starting overdue invoice reminder check`);

  let sentCount = 0;
  let errorCount = 0;

  try {
    const now = new Date();

    // Find unpaid, non-draft invoices that are past due
    const overdueInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        total: invoices.total,
        dueDate: invoices.dueDate,
        userId: invoices.userId,
        reminderSentAt: invoices.reminderSentAt,
      })
      .from(invoices)
      .where(
        and(
          // Due date is in the past
          lte(invoices.dueDate, now),
          // Not yet paid
          isNull(invoices.paidAt),
          // Status is not draft
          ne(invoices.status, "draft")
        )
      );

    console.log(
      `[Reminders] Found ${overdueInvoices.length} overdue invoices`
    );

    for (const invoice of overdueInvoices) {
      try {
        const invoiceUser = await db
          .select()
          .from(users)
          .where(eq(users.id, invoice.userId!))
          .limit(1);

        if (!invoiceUser || invoiceUser.length === 0) {
          console.warn(`[Reminders] ⚠️  User not found for invoice ${invoice.id}`);
          errorCount++;
          continue;
        }

        const user = invoiceUser[0];
        const daysSinceDue = Math.floor(
          (now.getTime() - (invoice.dueDate?.getTime() || 0)) /
            (1000 * 60 * 60 * 24)
        );

        // Send overdue reminder (limit to once per week to avoid spam)
        const lastReminder = invoice.reminderSentAt
          ? new Date(invoice.reminderSentAt)
          : null;
        const daysSinceLastReminder = lastReminder
          ? Math.floor(
              (now.getTime() - lastReminder.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999; // If no reminder sent yet, send immediately

        if (daysSinceLastReminder >= 7 || !invoice.reminderSentAt) {
          await sendOverdueReminderEmail(user.email, {
            invoiceNumber: invoice.invoiceNumber || invoice.id,
            clientName: invoice.clientName || "Client",
            amount: invoice.total?.toString() || "0",
            daysSinceDue,
          });

          await db
            .update(invoices)
            .set({ reminderSentAt: new Date() })
            .where(eq(invoices.id, invoice.id));

          sentCount++;
          console.log(
            `[Reminders] ✅ Overdue reminder sent for invoice ${invoice.invoiceNumber} (${daysSinceDue} days overdue)`
          );
        }
      } catch (error) {
        errorCount++;
        console.error(
          `[Reminders] ❌ Failed to send overdue reminder for invoice ${invoice.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `[Reminders] ✅ Overdue reminder check complete: ${sentCount} sent, ${errorCount} errors`
    );
    return { sent: sentCount, errors: errorCount };
  } catch (error) {
    console.error("[Reminders] ❌ Unhandled error during overdue reminder check:", error);
    return { sent: sentCount, errors: errorCount + 1 };
  }
}

/**
 * Send overdue reminder email helper
 */
async function sendOverdueReminderEmail(
  to: string,
  data: {
    invoiceNumber: string;
    clientName: string;
    amount: string;
    daysSinceDue: number;
  }
): Promise<void> {
  const html = `
    <h2 style="color: #d32f2f;">⚠️ Invoice Overdue Reminder</h2>
    <p>Hi,</p>
    <p>Your invoice <strong>#${data.invoiceNumber}</strong> from <strong>${data.clientName}</strong> is now <strong>${data.daysSinceDue} days overdue</strong>.</p>
    <div style="background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Invoice Amount:</strong> $${parseFloat(data.amount).toFixed(2)}</p>
    </div>
    <p>Please follow up with your client to collect payment.</p>
    <p>Best regards,<br/>TellBill Team</p>
  `;

  // For now, use sendReminderEmail with a note that it's overdue
  // In production, you might want a separate email template
  await sendReminderEmail(to, {
    invoiceNumber: data.invoiceNumber,
    clientName: data.clientName,
    amount: data.amount,
    dueDate: new Date().toISOString(),
  });
}
