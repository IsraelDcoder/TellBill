import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * GLOBAL ERROR RESPONSE FORMAT - All endpoints must follow this structure
 * 
 * Success Response (2xx):
 * {
 *   success: true,
 *   data?: any,
 *   message?: string
 * }
 * 
 * Error Response (4xx, 5xx):
 * {
 *   success: false,
 *   error: string (error_code),               // Machine-readable error key
 *   message: string,                          // User-friendly message
 *   statusCode: number,                       // HTTP status code
 *   details?: any,                            // Additional error context
 *   timestamp: string (ISO 8601)              // When error occurred
 * }
 * 
 * IMPORTANT: NEVER expose:
 * - Stack traces in production
 * - Internal error details
 * - Database connection strings
 * - API keys or credentials
 * - User passwords or tokens
 */

export interface ErrorResponse {
  success: false;
  error: string; // Error code/key (MISSING_TOKEN, EMAIL_NOT_VERIFIED, etc.)
  message: string; // User-friendly error message
  statusCode: number;
  details?: any; // Additional context for debugging
  timestamp: string; // ISO 8601 timestamp
}

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  timestamp?: string;
}

/**
 * Standard error codes used throughout the application
 * Client can use these to show appropriate UI state
 */
export const ERROR_CODES = {
  // Authentication
  MISSING_TOKEN: "MISSING_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
  AUTH_ERROR: "AUTH_ERROR",

  // Email Verification
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  EMAIL_ALREADY_VERIFIED: "EMAIL_ALREADY_VERIFIED",
  INVALID_VERIFICATION_TOKEN: "INVALID_VERIFICATION_TOKEN",

  // Account Management
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  INVALID_PASSWORD_STRENGTH: "INVALID_PASSWORD_STRENGTH",

  // User Data
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Payment/Billing
  SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  INVALID_SUBSCRIPTION_STATE: "INVALID_SUBSCRIPTION_STATE",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server Errors
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Not Found
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  ENDPOINT_NOT_FOUND: "ENDPOINT_NOT_FOUND",

  // Permissions
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
};

/**
 * Custom error class for standardized error handling
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handling middleware
 * Must be registered LAST in Express middleware chain
 * 
 * Usage:
 * app.use(errorHandler);
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log all errors for debugging
  const timestamp = new Date().toISOString();
  const requestId = req.get("x-request-id") || "unknown";

  if (error instanceof AppError) {
    // Our custom errors - known format
    logger.warn(
      {
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
        path: req.path,
        method: req.method,
        requestId,
      },
      "Application error"
    );

    return res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(error.details && { details: error.details }),
      timestamp,
    } as ErrorResponse);
  }

  // Unknown errors - don't expose details in production
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      requestId,
    },
    "Unhandled error"
  );

  // Return generic error in production
  const isDevelopment = process.env.NODE_ENV === "development";

  return res.status(500).json({
    success: false,
    error: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: isDevelopment
      ? error.message
      : "An internal server error occurred. Please try again later.",
    statusCode: 500,
    ...(isDevelopment && { details: error.stack }),
    timestamp,
  } as ErrorResponse);
}

/**
 * 404 Not Found middleware - handle unmatched routes
 * Must be registered before errorHandler but after all other routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    ERROR_CODES.ENDPOINT_NOT_FOUND,
    `Endpoint ${req.method} ${req.path} not found`,
    404
  );
  errorHandler(error, req, res, next);
}

/**
 * Helper to send success responses consistently
 * 
 * Usage:
 * return sendSuccess(res, 200, { user: userData }, "User created successfully");
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number = 200,
  data?: T,
  message?: string
) {
  return res.status(statusCode).json({
    success: true,
    ...(data && { data }),
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  } as SuccessResponse<T>);
}

/**
 * Helper to throw app errors consistently
 * 
 * Usage:
 * throw new AppError(ERROR_CODES.EMAIL_NOT_VERIFIED, "Please verify your email", 403);
 */
// AppError is already exported as a class above
