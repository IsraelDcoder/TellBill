import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { verifyAccessToken } from "../services/tokenService";

/**
 * Middleware to require valid JWT access token on protected routes
 * Validates token and attaches user ID to req.userId for use in handlers
 *
 * Usage: app.post("/api/protected", requireAuth, handler)
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        { path: req.path, method: req.method },
        "Request missing Authorization header"
      );
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
        code: "MISSING_TOKEN",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      logger.warn({ path: req.path }, "Invalid access token");
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired access token",
        code: "INVALID_TOKEN",
      });
    }

    // Attach user ID to request for use in handler
    (req as any).userId = payload.userId;
    (req as any).user = payload;

    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes("expired")) {
      logger.warn({ path: req.path }, "Access token expired");
      return res.status(401).json({
        error: "Unauthorized",
        message: "Access token expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
      });
    }

    logger.error({ error, path: req.path }, "Authorization middleware error");
    return res.status(401).json({
      error: "Unauthorized",
      message: "Failed to validate token",
      code: "AUTH_ERROR",
    });
  }
}


export async function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user || !user.emailVerifiedAt) {
    logger.warn({ userId: user?.userId }, "Request from unverified email");
    return res.status(403).json({
      error: "Forbidden",
      message: "Email verification required. Check your inbox for verification link.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  next();
}
