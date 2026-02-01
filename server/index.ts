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
import { securityHeaders } from "./utils/sanitize";
import { setupCorsSecurely } from "./utils/cors";

const app = express();
const log = console.log;

// Verify API keys are loaded
if (!process.env.OPENROUTER_API_KEY) {
  console.warn(
    "[WARNING] OPENROUTER_API_KEY not set. Invoice extraction may fail. Check .env file."
  );
}

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "[WARNING] GROQ_API_KEY not set. Audio transcription will fail. Get free API key from https://console.groq.com/"
  );
} else {
  console.log("[Config] ✅ GROQ_API_KEY configured");
}

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
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
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

  log("Serving static Expo files with dynamic manifest routing");

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

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

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

    // Initialize scope proof scheduler (handles reminders and expiry)
    initScopeProofScheduler();

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
      log(`express server serving on port ${port}`);
    });
  } catch (error) {
    console.error("[Server] Fatal initialization error:", error);
    process.exit(1);
  }
})().catch((error) => {
  console.error("[Server] Unhandled promise rejection:", error);
  process.exit(1);
});
