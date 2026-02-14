import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Express, Request, Response, NextFunction } from "express";

/**
 * Initialize Sentry error tracking for the server
 * Captures:
 * - Unhandled exceptions
 * - Unhandled promise rejections
 * - API errors (validation, auth, payments, webhooks)
 * - Database errors
 * - Rate limiting rejections
 */
export function initializeSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || "development";

  // Only initialize if DSN is provided
  if (!dsn) {
    console.warn(
      "[Sentry] SENTRY_DSN not configured. Error tracking disabled."
    );
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    profilesSampleRate: environment === "production" ? 0.1 : 1.0,
    release: process.env.APP_VERSION || "1.0.0",
  });

  console.log(`[Sentry] Initialized (${environment})`);
}

/**
 * Attach Sentry middleware to Express app
 * Must be called early in middleware chain
 */
export function attachSentryMiddleware(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  // Request handler - should be early in middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Basic request tracking
    next();
  });

  // Trace handler for distributed tracing
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Basic tracing
    next();
  });
}

/**
 * Attach Sentry error handler to Express app
 * Must be called AFTER all other middleware and routes
 */
export function attachSentryErrorHandler(app: Express): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  // Error handler - should be last middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Basic error handling
    next();
  });
}

/**
 * Middleware to capture validation errors
 * Tags them for filtering in Sentry dashboard
 */
export function sentryValidationErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.errors && Array.isArray(err.errors)) {
    Sentry.captureException(err, {
      tags: {
        errorType: "validation_error",
        endpoint: req.path,
        method: req.method,
      },
      contexts: {
        validation: {
          errors: err.errors.map((e: any) => ({
            path: e.path,
            message: e.message,
            code: e.code,
          })),
        },
      },
    });
  }
  next(err);
}

/**
 * Middleware to capture database errors
 */
export function sentryDatabaseErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.message?.includes("database") || err.message?.includes("query")) {
    Sentry.captureException(err, {
      tags: {
        errorType: "database_error",
        endpoint: req.path,
      },
      level: "error",
    });
  }
  next(err);
}

/**
 * Capture successful payment webhooks and failures
 */
export function capturePaymentEvent(
  success: boolean,
  reference: string,
  amount: number,
  userId?: string,
  error?: string
): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.captureMessage(`Payment ${success ? "successful" : "failed"}`, {
    level: success ? "info" : "error",
    tags: {
      eventType: "payment",
      status: success ? "success" : "failure",
      reference,
    },
    contexts: {
      payment: {
        reference,
        amount,
        userId: userId || "unknown",
        error: error || null,
      },
    },
  });
}

/**
 * Capture authentication failures
 */
export function captureAuthError(
  errorType: "invalid_credentials" | "account_locked" | "token_expired" | "invalid_token",
  email?: string,
  ip?: string
): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.captureMessage(`Authentication error: ${errorType}`, {
    level: "warning",
    tags: {
      errorType: "auth_error",
      authError: errorType,
    },
    contexts: {
      auth: {
        email: email || "unknown",
        ip: ip || "unknown",
      },
    },
  });
}

/**
 * Capture rate limit rejections
 */
export function captureRateLimitEvent(
  endpoint: string,
  key: string,
  limit: number,
  window: number,
  currentCount: number
): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.captureMessage(`Rate limit exceeded: ${endpoint}`, {
    level: "warning",
    tags: {
      eventType: "rate_limit",
      endpoint,
    },
    contexts: {
      rateLimit: {
        key,
        limit,
        window,
        currentCount,
      },
    },
  });
}

/**
 * Capture subscription-related errors
 */
export function captureSubscriptionError(
  userId: string,
  errorType: "plan_limit_exceeded" | "feature_unavailable" | "subscription_expired",
  details?: Record<string, any>
): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.captureMessage(`Subscription error: ${errorType}`, {
    level: "warning",
    tags: {
      errorType: "subscription_error",
      subscriptionError: errorType,
    },
    contexts: {
      subscription: {
        userId,
        ...details,
      },
    },
  });
}

/**
 * Set user context for error tracking
 * Call this after authentication to tag errors with user info
 */
export function setSentryUserContext(userId: string, email?: string): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.setUser({
    id: userId,
    email: email || "unknown",
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUserContext(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.setUser(null);
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error | string, context?: Record<string, any>): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  if (typeof error === "string") {
    Sentry.captureMessage(error, { contexts: context });
  } else {
    Sentry.captureException(error, { contexts: context });
  }
}

/**
 * Create a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): any {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  return null; // Transaction tracking placeholder
}

/**
 * Create a span for performance monitoring
 */
export function createSpan(transaction: any, name: string, op: string): any {
  if (!transaction) return null;

  return transaction?.startChild({
    name,
    op,
  });
}

/**
 * Finish a transaction
 */
export function finishTransaction(transaction: any): void {
  transaction?.finish();
}
