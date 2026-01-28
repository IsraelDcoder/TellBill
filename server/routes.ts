import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTranscriptionRoutes } from "./transcription";
import { registerAuthRoutes } from "./auth";
import { registerPaymentRoutes } from "./payments";
import { registerInvoiceRoutes } from "./invoices";
import { registerProjectRoutes } from "./projects";
import { registerDataLoadingRoutes } from "./dataLoading";
import { registerActivityLogRoutes } from "./activityLog";
import { registerScopeProofRoutes } from "./scopeProof";
import { authMiddleware } from "./utils/authMiddleware";
import { attachSubscriptionMiddleware, requirePaidPlan, requirePlan } from "./utils/subscriptionGuard";

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ AUTHENTICATION ROUTES (No auth required)
  registerAuthRoutes(app);

  // ✅ WEBHOOK ROUTES (No auth required - Flutterwave uses signature verification)
  registerPaymentRoutes(app);

  // ✅ PROTECTED ROUTES (Auth + Subscription required)
  // Apply auth middleware first, then subscription middleware
  app.use("/api/data-loading", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/payments", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/invoices", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/projects", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/activity", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/transcribe", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/scope-proof", authMiddleware, attachSubscriptionMiddleware);

  // Register data loading routes (fetch user data after login)
  registerDataLoadingRoutes(app);

  // Register invoice routes
  registerInvoiceRoutes(app);

  // Register project routes
  registerProjectRoutes(app);

  // Register activity log routes (audit trail)
  registerActivityLogRoutes(app);

  // Register transcription routes (uses OpenRouter API)
  registerTranscriptionRoutes(app);

  // ✅ Register scope proof routes (approval engine - protected inside)
  registerScopeProofRoutes(app);

  // ✅ STATIC APPROVAL PAGE (No auth required - token-based access)
  app.get("/approve/:token", (req, res) => {
    // Serve client approval web page
    res.sendFile("client/public/approve.html");
  });

  const httpServer = createServer(app);

  return httpServer;
}
