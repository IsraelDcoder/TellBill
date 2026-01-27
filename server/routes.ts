import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTranscriptionRoutes } from "./transcription";
import { registerAuthRoutes } from "./auth";
import { registerPaymentRoutes } from "./payments";
import { registerInvoiceRoutes } from "./invoices";
import { registerProjectRoutes } from "./projects";
import { registerDataLoadingRoutes } from "./dataLoading";
import { registerActivityLogRoutes } from "./activityLog";
import { registerScopeProofRoutes } from "./scopeProof"; // ✅ Scope Proof routes
import { authMiddleware } from "./utils/authMiddleware"; // ✅ JWT auth middleware
import { subscriptionMiddleware } from "./utils/subscriptionMiddleware"; // ✅ Subscription checks

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ AUTHENTICATION ROUTES (No auth required)
  registerAuthRoutes(app);

  // ✅ WEBHOOK ROUTES (No auth required - Flutterwave uses signature verification)
  // Register payment routes first (includes webhook)
  registerPaymentRoutes(app);

  // ✅ PROTECTED ROUTES (Auth required)
  // Apply auth middleware to all protected endpoints
  app.use("/api/data-loading", authMiddleware, subscriptionMiddleware);
  app.use("/api/payments", authMiddleware, subscriptionMiddleware);
  app.use("/api/invoices", authMiddleware, subscriptionMiddleware);
  app.use("/api/projects", authMiddleware, subscriptionMiddleware);
  app.use("/api/activity", authMiddleware, subscriptionMiddleware);
  app.use("/api/transcribe", authMiddleware, subscriptionMiddleware);
  app.use("/api/scope-proof", authMiddleware, subscriptionMiddleware);

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

  // ✅ Register scope proof routes (approval engine)
  registerScopeProofRoutes(app);

  // ✅ STATIC APPROVAL PAGE (No auth required - token-based access)
  app.get("/approve/:token", (req, res) => {
    // Serve client approval web page
    // This will be a static HTML file or React page
    res.sendFile("client/public/approve.html");
  });

  const httpServer = createServer(app);

  return httpServer;
}
