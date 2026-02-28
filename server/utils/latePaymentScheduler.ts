import { sendLatePaymentDay2Reminders, sendLatePaymentDay6Reminders, sendDay1OverdueNotifications } from "../emailService";

/**
 * Late Payment Automation & Overdue Workflow Scheduler
 * 
 * Day 1: Invoice becomes overdue → Send notification to contractor
 * Day 2: Still unpaid → Send friendly reminder to contractor about client
 * Day 6: Still unpaid → Send firm reminder to contractor
 *
 * Runs every hour to check for invoices that need notifications/reminders
 */

export async function sendOverdueWorkflow() {
  console.log("[Overdue Workflow] 🔔 Starting overdue workflow check...");
  
  try {
    // Send Day 1 overdue notifications (alerts contractor)
    const day1Results = await sendDay1OverdueNotifications();
    
    // Send Day 2 and Day 6 reminders (payment collection)
    const [day2Results, day6Results] = await Promise.all([
      sendLatePaymentDay2Reminders(),
      sendLatePaymentDay6Reminders(),
    ]);

    console.log(`[Overdue Workflow] ✅ Check completed - Day 1 notifications: ${day1Results.sent} sent, Day 2 reminders: ${day2Results.sent} sent, Day 6 reminders: ${day6Results.sent} sent`);
  } catch (error) {
    console.error("[Overdue Workflow] ❌ Error in overdue workflow:", error);
  }
}

/**
 * Initialize the overdue workflow scheduler
 * Runs every hour to:
 * - Alert contractors about overdue invoices (Day 1)
 * - Send payment reminders (Day 2, Day 6)
 */
export function initLatePaymentScheduler() {
  console.log("[Overdue Workflow] 🚀 Initializing overdue workflow scheduler...");
  
  // Run immediately on startup
  sendOverdueWorkflow().catch(error => {
    console.error("[Overdue Workflow] Error running initial check:", error);
  });
  
  // Then run every hour
  setInterval(() => {
    sendOverdueWorkflow().catch(error => {
      console.error("[Overdue Workflow] Error in scheduled check:", error);
    });
  }, 60 * 60 * 1000); // 1 hour
  
  console.log("[Overdue Workflow] ✅ Overdue workflow scheduler initialized");
}
