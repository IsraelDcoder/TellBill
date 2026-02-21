import cron from "node-cron";
import {
  sendDueInvoiceReminders,
  sendOverdueInvoiceReminders,
} from "../services/invoiceReminders";

/**
 * Invoice Reminders Scheduled Job
 * Runs daily to send reminders for upcoming due invoices
 */

export function startInvoiceRemindersJob() {
  console.log("[Jobs] 📅 Starting invoice reminders scheduler...");

  // Run at 9 AM every day
  // Cron format: minute hour day month dayOfWeek
  const sendRemindersJob = cron.schedule("0 9 * * *", async () => {
    console.log("[Jobs] 🔔 Running daily invoice reminders check...");
    try {
      const result = await sendDueInvoiceReminders({
        daysBeforeDue: 2, // Send 2 days before due date
        onlyUnpaid: true,
      });
      console.log(
        `[Jobs] ✅ Daily invoice reminders completed: ${result.sent} sent, ${result.errors} errors`
      );
    } catch (error) {
      console.error("[Jobs] ❌ Daily invoice reminders job failed:", error);
    }
  });

  // Run overdue reminders at 10 AM every day
  const overdueRemindersJob = cron.schedule("0 10 * * *", async () => {
    console.log("[Jobs] 🔔 Running overdue invoice reminders check...");
    try {
      const result = await sendOverdueInvoiceReminders();
      console.log(
        `[Jobs] ✅ Overdue reminders completed: ${result.sent} sent, ${result.errors} errors`
      );
    } catch (error) {
      console.error("[Jobs] ❌ Overdue reminders job failed:", error);
    }
  });

  console.log("[Jobs] ✅ Invoice reminders scheduler started");
  console.log("[Jobs]   - Daily reminders: 9:00 AM (2 days before due)");
  console.log("[Jobs]   - Overdue reminders: 10:00 AM (daily)");

  return {
    sendRemindersJob,
    overdueRemindersJob,
  };
}

/**
 * Stop all reminder jobs
 */
export function stopInvoiceRemindersJob(jobs: {
  sendRemindersJob: any;
  overdueRemindersJob: any;
}) {
  console.log("[Jobs] ⏹️  Stopping invoice reminders jobs...");
  jobs.sendRemindersJob.stop();
  jobs.overdueRemindersJob.stop();
  console.log("[Jobs] ✅ Invoice reminders jobs stopped");
}
