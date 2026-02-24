import { sendLatePaymentDay2Reminders, sendLatePaymentDay6Reminders } from "../emailService";

/**
 * Late Payment Automation Scheduler
 * Sends friendly reminders on Day 2, firm reminders on Day 6
 * Only for Pro+ users with feature enabled
 *
 * Runs every hour to check for invoices that need reminders
 */

export async function sendLatePaymentReminders() {
  console.log("[Late Payment Automation] 🔔 Starting late payment check...");
  
  try {
    // Send both Day 2 and Day 6 reminders
    const [day2Results, day6Results] = await Promise.all([
      sendLatePaymentDay2Reminders(),
      sendLatePaymentDay6Reminders(),
    ]);

    console.log(`[Late Payment Automation] ✅ Reminder check completed - Day 2: ${day2Results.sent} sent, Day 6: ${day6Results.sent} sent`);
  } catch (error) {
    console.error("[Late Payment Automation] ❌ Error in late payment check:", error);
  }
}

/**
 * Initialize the late payment automation scheduler
 * Runs every hour
 */
export function initLatePaymentScheduler() {
  console.log("[Late Payment Automation] 🚀 Initializing late payment scheduler...");
  
  // Run immediately on startup
  sendLatePaymentReminders().catch(error => {
    console.error("[Late Payment Automation] Error running initial reminder check:", error);
  });
  
  // Then run every hour
  setInterval(() => {
    sendLatePaymentReminders().catch(error => {
      console.error("[Late Payment Automation] Error in scheduled reminder check:", error);
    });
  }, 60 * 60 * 1000); // 1 hour
  
  console.log("[Late Payment Automation] ✅ Late payment scheduler initialized");
}
