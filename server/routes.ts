import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTranscriptionRoutes } from "./transcription";
import { registerAuthRoutes } from "./auth";
import { registerPaymentRoutes } from "./payments";
import { registerInventoryRoutes } from "./inventory";
import { registerInvoiceRoutes } from "./invoices";
import { registerProjectRoutes } from "./projects";
import { registerDataLoadingRoutes } from "./dataLoading";
import { registerActivityLogRoutes } from "./activityLog";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register authentication routes
  registerAuthRoutes(app);

  // Register data loading routes (fetch user data after login)
  registerDataLoadingRoutes(app);

  // Register payment routes
  registerPaymentRoutes(app);

  // Register inventory routes
  registerInventoryRoutes(app);

  // Register invoice routes
  registerInvoiceRoutes(app);

  // Register project routes
  registerProjectRoutes(app);

  // Register activity log routes (audit trail)
  registerActivityLogRoutes(app);

  // Register transcription routes (uses OpenRouter API)
  registerTranscriptionRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
