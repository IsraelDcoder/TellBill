import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTranscriptionRoutes } from "./transcription";
import { registerAuthRoutes } from "./auth";
import { registerPaymentRoutes } from "./payments";
import { registerInventoryRoutes } from "./inventory";
import { registerInvoiceRoutes } from "./invoices";
import { registerProjectRoutes } from "./projects";
import { registerClientSharingRoutes } from "./clientSharing";
import { registerDataLoadingRoutes } from "./dataLoading";
import { registerReceiptRoutes } from "./receiptRoutes";

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

  // Register client sharing routes (Feature 2.2)
  registerClientSharingRoutes(app);

  // Register receipt scanner routes (Feature 4.1)
  registerReceiptRoutes(app);

  // Register transcription routes (uses OpenRouter API)
  registerTranscriptionRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
