import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import {
  initializeSentry,
  attachSentryMiddleware,
  attachSentryErrorHandler,
} from "./utils/sentry";
import { initializeBackupSystem } from "./utils/backup";
import { initScopeProofScheduler } from "./utils/scopeProofScheduler";
import { startMoneyAlertsJobs, stopMoneyAlertsJobs } from "./jobs/moneyAlertsJob";
import { securityHeaders } from "./utils/sanitize";
import { setupCorsSecurely } from "./utils/cors";
import { logger, attachRequestLogging } from "./utils/logger";

const app = express();

// ✅ Initialize structured logging first
logger.info(`[Server] Starting TellBill backend (${process.env.NODE_ENV || "development"})`);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  // ✅ CORS Security Module handles all CORS logic
  // Supports development (localhost) and production (domain whitelist)
  setupCorsSecurely(app);
}

function setupBodyParsing(app: express.Application) {
  // ✅ Security Headers Middleware - Must be first
  app.use(securityHeaders);

  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
}

function setupRequestLogging(app: express.Application) {
  // ✅ Use structured logging middleware
  app.use(attachRequestLogging);
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  logger.info("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  logger.info("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    const requestId = (req as any).requestId || "unknown";
    logger.error(
      {
        requestId,
        status,
        path: req.path,
        method: req.method,
        error: err,
      },
      "Internal Server Error"
    );

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  try {
    // Initialize Sentry error tracking FIRST
    initializeSentry();

    // Initialize backup system (schedules daily, weekly, monthly backups)
    initializeBackupSystem();
    logger.info("✅ Backup system initialized");

    // Initialize scope proof scheduler (handles reminders and expiry)
    initScopeProofScheduler();
    logger.info("✅ Scope proof scheduler initialized");

    // Initialize Money Alerts scheduled jobs (detects unbilled work every 6 hours)
    startMoneyAlertsJobs();
    logger.info("✅ Money Alerts jobs initialized");

    setupCors(app);
    setupBodyParsing(app);
    setupRequestLogging(app);

    // Attach Sentry request handlers early in middleware chain
    attachSentryMiddleware(app);

    // Register API routes BEFORE static middleware to avoid conflicts
    const server = await registerRoutes(app);

    configureExpoAndLanding(app);

    setupErrorHandler(app);

    // Attach Sentry error handler LAST
    attachSentryErrorHandler(app);

    const port = parseInt(process.env.PORT || "3000", 10);
    server.listen(port, "0.0.0.0", () => {
      logger.info(`✅ Express server listening on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      stopMoneyAlertsJobs();
      process.exit(0);
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully...");
      stopMoneyAlertsJobs();
      process.exit(0);
    });
  } catch (error) {
    logger.error({ error }, "Fatal initialization error");
    process.exit(1);
  }
})().catch((error) => {
  console.error("[Server] Unhandled promise rejection:", error);
  process.exit(1);
});
