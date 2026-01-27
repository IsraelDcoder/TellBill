import { Request, Response, NextFunction } from "express";

/**
 * ✅ CORS SECURITY CONFIGURATION
 *
 * Configures Cross-Origin Resource Sharing (CORS) with:
 * - Development-friendly localhost support
 * - Production domain whitelist
 * - HTTP method restrictions
 * - Header validation
 * - Credential handling
 * - Preflight request handling
 */

interface CorsConfig {
  environment: "development" | "production";
  productionDomains: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

/**
 * Get CORS configuration based on environment
 */
export function getCorsConfig(): CorsConfig {
  const environment = (process.env.NODE_ENV || "development") as
    | "development"
    | "production";
  const isDevelopment = environment === "development";

  // Production domains from environment variable
  // Format: domain1.com,domain2.com
  const productionDomains = process.env.ALLOWED_DOMAINS
    ? process.env.ALLOWED_DOMAINS.split(",").map((d: string) => d.trim())
    : [];

  return {
    environment,
    productionDomains,
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Content-Length",
      "X-Content-Type-Options",
    ],
    maxAge: isDevelopment ? 3600 : 86400, // 1 hour dev, 24 hours prod
    credentials: true,
  };
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string, config: CorsConfig): boolean {
  if (!origin) return false;

  // Development: Allow localhost and local network IPs
  if (config.environment === "development") {
    // Localhost (any port)
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("https://localhost:") ||
      origin.startsWith("https://127.0.0.1:")
    ) {
      return true;
    }

    // Local network IPs (for React Native/Expo development)
    if (
      origin.startsWith("http://10.") ||
      origin.startsWith("http://172.") ||
      origin.startsWith("http://192.")
    ) {
      return true;
    }

    // HTTPS localhost for development
    if (
      origin.startsWith("https://localhost:") ||
      origin.startsWith("https://127.0.0.1:")
    ) {
      return true;
    }

    return false;
  }

  // Production: Only allow whitelisted domains
  if (config.environment === "production") {
    if (!config.productionDomains || config.productionDomains.length === 0) {
      console.warn(
        "[CORS] Production mode with no allowed domains configured"
      );
      return false;
    }

    // Check exact domain match or subdomain match
    for (const allowedDomain of config.productionDomains) {
      // Exact match
      if (origin === `https://${allowedDomain}`) {
        return true;
      }

      // Allow subdomains
      if (origin.endsWith(allowedDomain) && origin.includes(".")) {
        return true;
      }
    }

    return false;
  }

  return false;
}

/**
 * CORS Middleware
 * Handles CORS preflight and security headers
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void | any {
  const config = getCorsConfig();
  const origin = req.header("origin");

  // Check if origin is allowed
  const allowed = origin && isOriginAllowed(origin, config);

  if (allowed && origin) {
    // Set CORS headers
    res.header("Access-Control-Allow-Origin", origin);
    res.header(
      "Access-Control-Allow-Methods",
      config.allowedMethods.join(", ")
    );
    res.header(
      "Access-Control-Allow-Headers",
      config.allowedHeaders.join(", ")
    );
    res.header(
      "Access-Control-Expose-Headers",
      config.exposedHeaders.join(", ")
    );
    res.header("Access-Control-Allow-Credentials", String(config.credentials));
    res.header("Access-Control-Max-Age", String(config.maxAge));

    // Log allowed CORS request (development only)
    if (config.environment === "development") {
      console.log(`[CORS] ✅ Allowed: ${req.method} ${req.path} from ${origin}`);
    }
  } else if (origin) {
    // Log rejected CORS request
    console.warn(
      `[CORS] ❌ Rejected: ${req.method} ${req.path} from ${origin}`
    );
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    if (allowed) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(403);
    }
  }

  next();
}

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void | any {
  // Check for suspicious headers
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /<script/i,
    /onclick/i,
    /onerror/i,
  ];

  // Check Authorization header
  const auth = req.header("Authorization");
  if (auth) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(auth)) {
        console.warn(
          `[Security] Suspicious Authorization header detected: ${req.ip}`
        );
        return res.status(400).json({
          error: "Invalid Authorization header",
        });
      }
    }
  }

  // Check User-Agent header for suspicious patterns
  const userAgent = req.header("User-Agent");
  if (userAgent && userAgent.length > 500) {
    console.warn(
      `[Security] Unusually long User-Agent detected: ${req.ip}`
    );
    return res.status(400).json({
      error: "Invalid User-Agent header",
    });
  }

  next();
}

/**
 * Rate limit preflight requests
 * Prevents CORS preflight flooding attacks
 */
export function limitPreflightRequests(
  req: Request,
  res: Response,
  next: NextFunction
): void | any {
  // Store preflight request counts
  if (!global.preflightRequests) {
    global.preflightRequests = new Map();
  }

  if (req.method === "OPTIONS") {
    const clientIp = req.ip || "unknown";
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Get previous requests from this IP
    const requests = (global.preflightRequests as Map<string, number[]>).get(
      clientIp
    ) || [];

    // Remove old requests
    const recentRequests = requests.filter((time) => time > oneMinuteAgo);

    // Check if limit exceeded (100 preflights per minute)
    if (recentRequests.length > 100) {
      console.warn(
        `[Security] Excessive CORS preflight requests from ${clientIp}`
      );
      return res.status(429).json({
        error: "Too many preflight requests",
      });
    }

    // Add current request
    recentRequests.push(now);
    (global.preflightRequests as Map<string, number[]>).set(clientIp, recentRequests);

    // Cleanup old entries
    if ((global.preflightRequests as Map<string, number[]>).size > 10000) {
      (global.preflightRequests as Map<string, number[]>).clear();
    }
  }

  next();
}

/**
 * CORS Violation Reporter
 * Logs CORS violations for security monitoring
 */
export function reportCorsViolation(
  req: Request,
  res: Response,
  next: NextFunction
): void | any {
  const config = getCorsConfig();
  const origin = req.header("origin");

  // Check if this is a CORS request that would be rejected
  if (
    origin &&
    !isOriginAllowed(origin, config) &&
    config.environment === "production"
  ) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        type: "CORS_VIOLATION",
        ip: req.ip,
        origin,
        method: req.method,
        path: req.path,
        userAgent: req.header("User-Agent"),
      })
    );

    // Optionally send to error tracking service (Sentry)
    try {
      const Sentry = require("./sentry");
      if (Sentry && Sentry.captureException) {
        Sentry.captureException(
          new Error("CORS violation detected"),
          {
            tags: {
              type: "cors_violation",
              origin,
            },
            contexts: {
              cors: {
                requestOrigin: origin,
                ip: req.ip,
              },
            },
          }
        );
      }
    } catch (error) {
      // Sentry not available or not configured
    }
  }

  next();
}

/**
 * Default CORS configuration for Express app
 */
export function setupCorsSecurely(app: any): void {
  const config = getCorsConfig();

  console.log(`[CORS] Initializing in ${config.environment} mode`);

  if (config.environment === "development") {
    console.log(`[CORS] Development: Allowing localhost and local network`);
  } else {
    console.log(
      `[CORS] Production: Allowing domains: ${config.productionDomains.join(", ")}`
    );
  }

  // Apply middleware in order
  app.use(corsMiddleware);
  app.use(validateRequestHeaders);
  app.use(limitPreflightRequests);
  app.use(reportCorsViolation);
}

/**
 * Type augmentation for global scope
 */
declare global {
  var preflightRequests: Map<string, number[]> | undefined;
}
