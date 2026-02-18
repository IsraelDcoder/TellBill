import type { Express, Request, Response } from "express";
import { stripe } from "./stripeClient";
import { getPlanByPriceId } from "./stripePlans";
import { db } from "../db";
import { users, webhookProcessed, invoices as invoicesSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import type Stripe from "stripe";
import { randomUUID } from "crypto";


export function registerStripeWebhookRoutes(app: Express) {
  app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook not configured" });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.rawBody as Buffer, signature, webhookSecret);
      logger.info({ eventType: event.type, eventId: event.id }, "Stripe webhook received");
    } catch (error) {
      logger.warn({ error }, "Webhook signature verification failed");
      return res.status(400).json({ error: "Invalid signature" });
    }

    try {
      // ✅ IDEMPOTENCY: Check if webhook already processed
      // Prevent duplicate charges from Stripe retries
      const existingEvent = await db
        .select()
        .from(webhookProcessed)
        .where(eq(webhookProcessed.stripeEventId, event.id));

      if (existingEvent.length > 0) {
        logger.info(
          { eventId: event.id, eventType: event.type },
          "Webhook already processed (duplicate)"
        );
        // Return 200 success to Stripe even though we skip processing
        return res.status(200).json({ received: true, status: "already_processed" });
      }

      // Handle checkout.session.completed
      if (event.type === "checkout.session.completed") {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      }

      // ✅ Handle payment_intent.succeeded (Direct invoice payments)
      if (event.type === "payment_intent.succeeded") {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      }

      // Handle invoice.payment_succeeded
      if (event.type === "invoice.payment_succeeded") {
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      }

      // Handle customer.subscription.deleted (cancellation)
      if (event.type === "customer.subscription.deleted") {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      }

      // Handle customer.subscription.updated (status changes)
      if (event.type === "customer.subscription.updated") {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      }

      // ✅ MARK as processed AFTER successfully handling
      await db
        .insert(webhookProcessed)
        .values({
          id: randomUUID(),
          stripeEventId: event.id,
          eventType: event.type,
        });

      logger.info({ eventId: event.id, eventType: event.type }, "Webhook processed successfully");
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error({ error, eventType: event.type }, "Webhook handler error");
      // ✅ Still mark as processed even on error to prevent infinite retries
      // (Log error for manual review)
      await db
        .insert(webhookProcessed)
        .values({
          id: randomUUID(),
          stripeEventId: event.id,
          eventType: event.type,
          metadata: JSON.stringify({ error: String(error) }),
        })
        .catch((dbError) => logger.error({ dbError }, "Failed to mark webhook as processed"));

      res.status(200).json({ received: true, error: "Internal handler error" });
    }
  });
}

/**
 * Handle checkout.session.completed
 * - User completed payment
 * - Extract userId and plan from metadata
 * - Create/update Stripe customer/subscription in DB
 * - Update user subscription plan
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!userId || !plan) {
    logger.warn({ sessionId: session.id }, "Checkout session missing metadata");
    return;
  }

  logger.info(
    { userId, plan, sessionId: session.id, customerId: stripeCustomerId },
    "Processing checkout completion"
  );

  // Update user with Stripe subscription info
  await db
    .update(users)
    .set({
      stripeCustomerId,
      stripeSubscriptionId,
      currentPlan: plan,
      subscriptionStatus: "active",
    })
    .where(eq(users.id, userId));

  logger.info({ userId, plan }, "User subscription activated");
}

/**
 * Handle invoice.payment_succeeded
 * - Recurring payment succeeded
 * - Verify subscription is still active
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeCustomerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  logger.info(
    { invoiceId: invoice.id, customerId: stripeCustomerId },
    "Invoice payment succeeded"
  );

  // Retrieve subscription to get plan info
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.items.data.length === 0) {
    logger.warn({ subscriptionId }, "Subscription has no line items");
    return;
  }

  // Get the price to determine plan
  const priceId = subscription.items.data[0].price.id;
  const plan = getPlanByPriceId(priceId);

  if (!plan) {
    logger.warn({ priceId }, "Price ID not mapped to plan");
    return;
  }

  // Find user by Stripe customer ID
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (userRecord.length === 0) {
    logger.warn({ customerId: stripeCustomerId }, "User not found for Stripe customer"); 
    return;
  }

  const userId = userRecord[0].id;

  // Update subscription status
  await db
    .update(users)
    .set({
      currentPlan: plan.tier,
      subscriptionStatus: "active",
    })
    .where(eq(users.id, userId));

  logger.info({ userId, plan: plan.tier }, "User subscription renewed");
}

/**
 * Handle customer.subscription.deleted
 * - Subscription cancelled
 * - Downgrade user to free plan
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId = subscription.customer as string;

  logger.info({ customerId: stripeCustomerId, subscriptionId: subscription.id }, "Subscription deleted");

  // Find user by Stripe customer ID
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (userRecord.length === 0) {
    logger.warn({ customerId: stripeCustomerId }, "User not found for subscription cancellation");
    return;
  }

  const userId = userRecord[0].id;

  // Downgrade to free plan
  await db
    .update(users)
    .set({
      currentPlan: "free",
      subscriptionStatus: "cancelled",
      stripeSubscriptionId: null,
    })
    .where(eq(users.id, userId));

  logger.info({ userId }, "User downgraded to free plan");
}

/**
 * Handle customer.subscription.updated
 * - Plan changed, status updated, etc.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeCustomerId = subscription.customer as string;

  logger.info({ customerId: stripeCustomerId, status: subscription.status }, "Subscription updated");

  // Find user
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (userRecord.length === 0) {
    return;
  }

  const userId = userRecord[0].id;

  // Update status (handle past_due, etc.)
  await db
    .update(users)
    .set({
      subscriptionStatus: subscription.status,
    })
    .where(eq(users.id, userId));

  logger.info({ userId, status: subscription.status }, "Subscription status updated");
}

/**
 * ✅ Handle payment_intent.succeeded
 * - This fires when a direct payment (from checkout session) succeeds
 * - Update invoice status to "paid"
 * - Track payment in database
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  const userId = paymentIntent.metadata?.userId;

  if (!invoiceId) {
    logger.warn({ paymentIntentId: paymentIntent.id }, "Payment intent missing invoiceId metadata");
    return;
  }

  logger.info(
    { invoiceId, paymentIntentId: paymentIntent.id, amount: paymentIntent.amount },
    "Processing successful invoice payment"
  );

  try {
    // Update invoice status to "paid"
    const result = await db
      .update(invoicesSchema)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntent.id,
      })
      .where(eq(invoicesSchema.id, invoiceId));

    logger.info(
      { invoiceId, paymentIntentId: paymentIntent.id },
      "✅ Invoice marked as paid"
    );

    // Fetch invoice details for logging
    const invoice = await db
      .select()
      .from(invoicesSchema)
      .where(eq(invoicesSchema.id, invoiceId))
      .limit(1);

    if (invoice && invoice.length > 0) {
      const inv = invoice[0];
      logger.info(
        { invoiceId, clientName: inv.clientName, amount: inv.total, userId },
        "💰 Payment received and processed"
      );
    }
  } catch (error) {
    logger.error(
      { invoiceId, paymentIntentId: paymentIntent.id, error },
      "❌ Failed to update invoice payment status"
    );
    throw error;
  }
}
