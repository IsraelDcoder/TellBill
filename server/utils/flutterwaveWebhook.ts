 import crypto from "crypto";
import { Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { upgradeSubscription } from "./subscriptionManager";
import { sendPaymentConfirmationEmail } from "../emailService";
import { capturePaymentEvent, captureException } from "./sentry";


export type FlutterwaveEventType =
  | "charge.completed"
  | "charge.failed"
  | "transfer.completed"
  | "transfer.failed"
  | "payout.failed";

/**
 * Flutterwave webhook event payload
 */
export interface FlutterwaveWebhookPayload {
  event: FlutterwaveEventType;
  data: {
    id: number;
    tx_ref: string; // Our custom reference: tellbill_solo_userId_timestamp
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    charged_amount: number;
    app_fee: number;
    status: "successful" | "failed" | "pending";
    currency: string;
    customer: {
      id: number;
      name: string;
      email: string;
      phone_number: string;
    };
    meta?: {
      plan?: string;
      userId?: string;
    };
  };
}

/**
 * Verify Flutterwave webhook signature
 * Flutterwave sends X-Flutterwave-Signature header with HMAC-SHA256 hash
 */
export function verifyFlutterwaveSignature(
  payload: string,
  signature: string,
  secretKey: string
): boolean {
  try {
    const hash = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error("[Webhook] Signature verification failed:", error);
    return false;
  }
}

/**
 * Extract plan from payment reference
 * Format: tellbill_PLAN_USERID_TIMESTAMP
 */
export function extractPlanFromReference(reference: string): string | null {
  const parts = reference.split("_");
  if (parts.length < 2 || parts[0] !== "tellbill") {
    return null;
  }
  return parts[1]; // solo, team, enterprise
}

/**
 * Extract userId from payment reference
 */
export function extractUserIdFromReference(reference: string): string | null {
  const parts = reference.split("_");
  if (parts.length < 3 || parts[0] !== "tellbill") {
    return null;
  }
  return parts[2]; // UUID
}

/**
 * Check if payment was already processed (idempotency)
 */
export async function isPaymentProcessed(
  transactionId: string
): Promise<boolean> {
  try {
    // In production, you'd query a payments table
    // For now, we check if user's subscription was recently updated
    // A more robust approach: store transaction IDs in database
    return false; // TODO: Implement with database
  } catch (error) {
    console.error("[Webhook] Idempotency check error:", error);
    return false;
  }
}

/**
 * Log webhook event for audit trail
 */
export function logWebhookEvent(
  eventType: string,
  reference: string,
  status: string,
  details: any
): void {
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        service: "flutterwave-webhook",
        eventType,
        reference,
        status,
        details,
      },
      null,
      2
    )
  );
}

/**
 * Handle successful payment
 */
export async function handlePaymentSuccess(
  payload: FlutterwaveWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data } = payload;
    const { tx_ref, amount, status, customer } = data;

    // Validate payment status
    if (status !== "successful") {
      return {
        success: false,
        error: `Invalid payment status: ${status}`,
      };
    }

    // Extract plan and userId from reference
    const plan = extractPlanFromReference(tx_ref);
    const userId = extractUserIdFromReference(tx_ref);

    if (!plan || !userId) {
      logWebhookEvent("charge.completed", tx_ref, "rejected", {
        reason: "Invalid reference format",
        txRef: tx_ref,
      });
      return {
        success: false,
        error: "Invalid payment reference format",
      };
    }

    // Validate plan
    if (!["solo", "team", "enterprise"].includes(plan)) {
      logWebhookEvent("charge.completed", tx_ref, "rejected", {
        reason: "Invalid plan",
        plan,
      });
      return {
        success: false,
        error: `Invalid plan: ${plan}`,
      };
    }

    // Verify user exists
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      logWebhookEvent("charge.completed", tx_ref, "rejected", {
        reason: "User not found",
        userId,
      });
      return {
        success: false,
        error: "User not found",
      };
    }

    const user = userResult[0];

    // ✅ UPGRADE SUBSCRIPTION
    const upgradeResult = await upgradeSubscription(userId, plan as any, "active");

    if (!upgradeResult.success) {
      logWebhookEvent("charge.completed", tx_ref, "failed", {
        reason: "Subscription upgrade failed",
        error: upgradeResult.error,
      });
      
      // Capture payment failure in Sentry
      capturePaymentEvent(false, tx_ref, amount, userId, upgradeResult.error);
      
      return {
        success: false,
        error: upgradeResult.error,
      };
    }

    // ✅ SEND CONFIRMATION EMAIL
    try {
      await sendPaymentConfirmationEmail(
        customer.email || user.email,
        {
          name: customer.name || user.name || "User",
          plan,
          amount: (amount / 100).toFixed(2), // Convert from cents to dollars
          currency: data.currency || "USD",
          date: new Date().toLocaleDateString(),
        }
      );
    } catch (emailError) {
      console.error("[Webhook] Failed to send confirmation email:", emailError);
      captureException(emailError as Error, {
        operation: "send_payment_confirmation_email",
        reference: tx_ref,
        userId,
      });
      // Don't fail the webhook if email fails - subscription already upgraded
    }

    // ✅ LOG SUCCESS
    logWebhookEvent("charge.completed", tx_ref, "processed", {
      userId,
      plan,
      amount,
      customerEmail: customer.email,
    });

    // Capture successful payment in Sentry
    capturePaymentEvent(true, tx_ref, amount, userId, undefined);

    return { success: true };
  } catch (error) {
    console.error("[Webhook] Payment success handler error:", error);
    captureException(error as Error, {
      operation: "handle_payment_success",
      reference: (error as any)?.tx_ref,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle failed payment
 */
export async function handlePaymentFailed(
  payload: FlutterwaveWebhookPayload
): Promise<void> {
  try {
    const { data } = payload;
    const { tx_ref, status, customer, amount } = data;

    logWebhookEvent("charge.failed", tx_ref, status, {
      customerEmail: customer.email,
      reason: `Payment failed with status: ${status}`,
    });

    // Extract userId from reference to capture the failure
    const userId = extractUserIdFromReference(tx_ref);
    
    // Capture payment failure in Sentry
    if (userId) {
      capturePaymentEvent(false, tx_ref, amount, userId, `Payment failed with status: ${status}`);
    }

    // In production: send email to user about failed payment
    // User can retry payment
  } catch (error) {
    console.error("[Webhook] Payment failed handler error:", error);
    captureException(error as Error, {
      operation: "handle_payment_failed",
    });
  }
}

/**
 * Main webhook handler
 */
export async function handleFlutterwaveWebhook(
  req: Request,
  res: Response
): Promise<void | any> {
  try {
    const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";

    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error("[Webhook] FLUTTERWAVE_SECRET_KEY not configured");
      return res.status(500).json({
        error: "Webhook service not configured",
      });
    }

    // Get signature from headers
    const signature = req.headers["x-flutterwave-signature"] as string;

    if (!signature) {
      console.warn("[Webhook] Missing signature header");
      return res.status(401).json({
        error: "Missing signature",
      });
    }

    // Get raw body as string for signature verification
    const payload = JSON.stringify(req.body);

    // ✅ VERIFY SIGNATURE
    const isValid = verifyFlutterwaveSignature(
      payload,
      signature,
      FLUTTERWAVE_SECRET_KEY
    );

    if (!isValid) {
      console.warn("[Webhook] Invalid signature");
      logWebhookEvent("signature_check", "unknown", "failed", {
        reason: "Invalid signature",
      });
      
      // Capture invalid signature attempt
      captureException("Webhook signature verification failed", {
        endpoint: "/api/webhooks/flutterwave",
        operation: "signature_verification",
        txRef: (req.body as any)?.data?.tx_ref,
      });
      
      return res.status(401).json({
        error: "Invalid signature",
      });
    }

    const webhookPayload = req.body as FlutterwaveWebhookPayload;
    const { event, data } = webhookPayload;

    console.log(`[Webhook] Processing event: ${event}`, {
      reference: data.tx_ref,
      status: data.status,
    });

    // Route to appropriate handler
    if (event === "charge.completed" && data.status === "successful") {
      const result = await handlePaymentSuccess(webhookPayload);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Payment processed successfully",
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } else if (event === "charge.failed" || data.status === "failed") {
      await handlePaymentFailed(webhookPayload);

      return res.status(200).json({
        success: true,
        message: "Failed payment logged",
      });
    } else {
      logWebhookEvent(event, data.tx_ref, "ignored", {
        reason: `Unhandled event type: ${event}`,
      });

      return res.status(200).json({
        success: true,
        message: "Event received but not processed",
      });
    }
  } catch (error) {
    console.error("[Webhook] Handler error:", error);
    captureException(error as Error, {
      endpoint: "/api/webhooks/flutterwave",
      operation: "handle_webhook",
    });
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
