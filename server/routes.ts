import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTranscriptionRoutes } from "./transcription";
import { registerAuthRoutes } from "./auth";
import { registerRevenueCatRoutes } from "./revenuecat";
import { registerStripeRoutes } from "./payments/stripe";
import { registerStripeWebhookRoutes } from "./payments/stripeWebhook";
import { registerInvoiceRoutes } from "./invoices";
import { registerDataLoadingRoutes } from "./dataLoading";
import { registerActivityLogRoutes } from "./activityLog";
import { registerScopeProofRoutes } from "./scopeProof";
import { registerTaxRoutes } from "./tax";
import { registerMaterialCostRoutes } from "./materialCosts";
import { registerMoneyAlertRoutes } from "./moneyAlerts";
import { authMiddleware } from "./utils/authMiddleware";
import { attachSubscriptionMiddleware, requirePaidPlan, requirePlan } from "./utils/subscriptionGuard";

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ HEALTH CHECK (No auth required - for Docker healthchecks and load balancers)
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.APP_VERSION || "1.0.0",
    });
  });

  // ✅ AUTHENTICATION ROUTES (No auth required)
  registerAuthRoutes(app);

  // ✅ REVENUCAT SUBSCRIPTION ROUTES
  // Webhook route (no auth) + protected routes (auth required)
  registerRevenueCatRoutes(app);

  // ✅ STRIPE PAYMENT ROUTES
  // Webhook (no auth) + protected checkout/portal routes
  registerStripeWebhookRoutes(app);
  registerStripeRoutes(app);

  // ✅ PROTECTED ROUTES (Auth + Subscription required)
  // Apply auth middleware first, then subscription middleware
  app.use("/api/data-loading", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/invoices", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/activity", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/transcribe", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/extract-invoice", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/scope-proof", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/tax", authMiddleware); // Tax routes require auth but not subscription limit

  // Register data loading routes (fetch user data after login)
  registerDataLoadingRoutes(app);

  // Register invoice routes
  registerInvoiceRoutes(app);

  // Register activity log routes (audit trail)
  registerActivityLogRoutes(app);

  // Register tax routes (user-configurable tax settings)
  registerTaxRoutes(app);

  // Register transcription routes (uses OpenRouter API)
  registerTranscriptionRoutes(app);

  // ✅ Register scope proof routes (approval engine - protected inside)
  registerScopeProofRoutes(app);

  // ✅ Register material cost routes (receipt scanner v2 - paid only)
  registerMaterialCostRoutes(app);

  // ✅ Register money alert routes (unbilled materials tracking)
  registerMoneyAlertRoutes(app);

  // ✅ STATIC APPROVAL PAGE (No auth required - token-based access)
  app.get("/approve/:token", (req, res) => {
    // Serve client approval web page
    res.sendFile("client/public/approve.html");
  });

  const httpServer = createServer(app);

  return httpServer;
}
