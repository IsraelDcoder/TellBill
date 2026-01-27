import { db } from "../db";
import { scopeProofs, scopeProofNotifications, users as usersTable } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sendEmail } from "../emailService";

/**
 * ✅ SCOPE PROOF EXPIRY & REMINDER SCHEDULER
 * 
 * Runs every 1 hour to:
 * 1. Send 12-hour reminders for pending approvals
 * 2. Mark expired approvals as such
 * 3. Notify contractors of expiry
 */

export async function checkScopeProofReminders() {
  console.log("[ScopeProof] Running reminder check...");

  try {
    const now = new Date();
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in13Hours = new Date(now.getTime() + 13 * 60 * 60 * 1000);

    // FIND PENDING APPROVALS EXPIRING IN ~12 HOURS
    const expiringSoon = await db
      .select()
      .from(scopeProofs)
      .where(
        and(
          eq(scopeProofs.status, "pending"),
          gte(scopeProofs.tokenExpiresAt, in12Hours),
          lte(scopeProofs.tokenExpiresAt, in13Hours)
        )
      );

    console.log(`[ScopeProof] Found ${expiringSoon.length} approvals expiring in 12 hours`);

    for (const proof of expiringSoon) {
      // Check if reminder already sent
      const reminderSent = await db
        .select()
        .from(scopeProofNotifications)
        .where(
          and(
            eq(scopeProofNotifications.scopeProofId, proof.id),
            eq(scopeProofNotifications.notificationType, "reminder")
          )
        );

      if (reminderSent.length === 0) {
        // Send reminder email to contractor
        try {
          const contractor = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, proof.userId))
            .limit(1);

          if (contractor.length > 0) {
            const contractorName = contractor[0]?.companyName || "Your Company";
            const expiresAt = new Date(proof.tokenExpiresAt || "");
            const timeLeft = Math.round(
              (expiresAt.getTime() - now.getTime()) / (60 * 60 * 1000)
            );

            await sendEmail({
              to: contractor[0].email,
              subject: `⏰ Approval expiring in ${timeLeft} hours`,
              html: generateReminderEmail(proof.description, timeLeft, contractorName, proof.approvalToken),
            });

            // Record reminder sent
            await db.insert(scopeProofNotifications).values({
              scopeProofId: proof.id,
              notificationType: "reminder",
              sentVia: "email",
            });
          }
        } catch (error) {
          console.error(`[ScopeProof] Failed to send reminder for ${proof.id}:`, error);
        }
      }
    }

    // MARK EXPIRED APPROVALS
    const expiredProofs = await db
      .select()
      .from(scopeProofs)
      .where(and(eq(scopeProofs.status, "pending"), lte(scopeProofs.tokenExpiresAt, now)));

    if (expiredProofs.length > 0) {
      await db
        .update(scopeProofs)
        .set({ status: "expired" })
        .where(and(eq(scopeProofs.status, "pending"), lte(scopeProofs.tokenExpiresAt, now)));

      console.log(`[ScopeProof] Marked ${expiredProofs.length} approvals as expired`);

      // Notify contractors of expiry
      for (const proof of expiredProofs) {
        try {
          const contractor = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, proof.userId))
            .limit(1);

          if (contractor.length > 0) {
            const contractorName = contractor[0]?.companyName || "Your Company";

            await sendEmail({
              to: contractor[0].email,
              subject: `❌ Approval expired - ${proof.description}`,
              html: generateExpiryEmail(
                proof.description,
                contractorName,
                proof.estimatedCost
              ),
            });

            console.log(
              `[ScopeProof] Expiry notification sent for ${proof.id}`
            );
          }
        } catch (error) {
          console.error(
            `[ScopeProof] Failed to notify expiry for ${proof.id}:`,
            error
          );
        }
      }
    }

    console.log("[ScopeProof] Reminder check complete");
  } catch (error) {
    console.error("[ScopeProof] Error in reminder check:", error);
  }
}

/**
 * Initialize scheduler - runs every 1 hour
 */
export function initScopeProofScheduler() {
  console.log("[ScopeProof] Initializing scheduler (runs every 1 hour)");

  // Run immediately on startup
  checkScopeProofReminders();

  // Run every hour
  setInterval(checkScopeProofReminders, 60 * 60 * 1000);
}

/**
 * Email template for 12-hour reminder
 */
function generateReminderEmail(
  workDescription: string,
  hoursLeft: number,
  contractorName: string,
  approvalToken: string
): string {
  const approvalUrl = `${process.env.FRONTEND_URL || "https://tellbill.app"}/approve/${approvalToken}`;

  return `
    <table style="width: 100%; max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Approval Expiring Soon</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px; background: #f9fafb;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">Hi,</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">
            Your client approval request for <strong>"${workDescription}"</strong> expires in <strong>${hoursLeft} hours</strong>.
          </p>

          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">
            Estimated cost: <strong style="color: #d4af37; font-size: 18px;">$${parseFloat(
              String(approvalToken)
            ).toFixed(2)}</strong>
          </p>

          <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">
            If client doesn't approve by then, the request will expire and you'll need to send a new one.
          </p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${approvalUrl}" style="background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Approval Status
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            Questions? Reply to this email or contact support@tellbill.app
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Email template for expiry notification
 */
function generateExpiryEmail(
  workDescription: string,
  contractorName: string,
  estimatedCost: string | number
): string {
  return `
    <table style="width: 100%; max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);">
          <h1 style="color: white; margin: 0; font-size: 24px;">❌ Approval Expired</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px; background: #fef2f2; border-left: 4px solid #ef4444;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">Hi,</p>
          
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">
            Your approval request for <strong>"${workDescription}"</strong> has expired.
          </p>

          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937;">
            The client didn't approve within the 24-hour window. No worries—you can send a new approval request anytime.
          </p>

          <div style="margin: 30px 0; padding: 20px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              <strong>What now?</strong><br>
              1. Open TellBill app<br>
              2. Go to Approvals tab<br>
              3. Create a new scope proof request<br>
              4. Send to client
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            This work won't be forgotten—when you're ready, request approval again.
          </p>
        </td>
      </tr>
    </table>
  `;
}
