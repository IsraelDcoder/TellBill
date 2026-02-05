import pino from "pino";
import type { Request, Response } from "express";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
    transport:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
              singleLine: false,
            },
          },
  },
);

export function attachRequestLogging(req: Request, res: Response, next: any) {
  const requestId = (req.headers["x-request-id"] || crypto.randomUUID()) as string;
  const startTime = Date.now();

  // Attach to request for later use
  (req as any).requestId = requestId;
  (req as any).logger = logger.child({ requestId });

  // Log request
  (req as any).logger.info(
    {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
    "Incoming request",
  );

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    (req as any).logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      },
      "Request completed",
    );
  });

  next();
}

/**
 * Log errors with context
 */
export function logError(error: any, context: string, req?: Request) {
  const requestId = req && (req as any).requestId ? (req as any).requestId : "unknown";
  const log = logger.child({ requestId, context });

  if (error instanceof Error) {
    log.error(
      {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
    );
  } else {
    log.error({ error }, context);
  }
}

/**
 * Log database queries (for debugging)
 */
export function logDatabaseQuery(query: string, duration: number, rows?: number) {
  if (process.env.LOG_LEVEL === "trace" || process.env.LOG_LEVEL === "debug") {
    logger.debug(
      {
        query,
        duration,
        rows,
      },
      "Database query",
    );
  }
}

/**
 * Log API calls to external services
 */
export function logExternalAPI(service: string, method: string, url: string, status: number, duration: number) {
  const level = status >= 400 ? "warn" : "debug";
  logger[level as "warn" | "debug"](
    {
      service,
      method,
      url,
      status,
      duration,
    },
    "External API call",
  );
}

export default logger;
