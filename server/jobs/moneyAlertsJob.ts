import cron from "node-cron";
import { MoneyAlertsEngine } from "../moneyAlertsEngine";

/**
 * Money Alerts Scheduled Jobs
 * Runs detection for draft invoices not sent after 24h
 */

let scheduledJob: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start scheduled jobs
 * Call this on server startup
 */
export function startMoneyAlertsJobs(): void {
  console.log("[Money Alerts Jobs] Starting scheduled jobs...");

  // Run every 6 hours to check for draft invoices
  // Pattern: "0 */6 * * *" = at 0 minutes, every 6 hours
  scheduledJob = cron.schedule("0 */6 * * *", async () => {
    console.log("[Money Alerts Jobs] Running draft invoice detection job...");
    try {
      await MoneyAlertsEngine.detectDraftInvoicesNotSent();
      console.log("[Money Alerts Jobs] Draft invoice detection completed successfully");
    } catch (error) {
      console.error("[Money Alerts Jobs] Error in draft invoice detection:", error);
    }
  });

  console.log("[Money Alerts Jobs] Scheduled jobs started successfully");
}

/**
 * Stop scheduled jobs
 * Call this on server shutdown
 */
export function stopMoneyAlertsJobs(): void {
  if (scheduledJob) {
    console.log("[Money Alerts Jobs] Stopping scheduled jobs...");
    scheduledJob.stop();
    scheduledJob = null;
  }
}
