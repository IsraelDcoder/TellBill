import type { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JwtPayload } from "./jwt";


declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      token?: string;
    }
  }
}


export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.get("Authorization");
    console.log(`[Auth Middleware] Request to ${req.method} ${req.path}`);
    console.log(`[Auth Middleware] Authorization header present: ${authHeader ? "✅ YES" : "❌ NO"}`);
    
    const token = extractTokenFromHeader(authHeader);
    console.log(`[Auth Middleware] Token extracted: ${token ? "✅ YES (length: " + token.length + ")" : "❌ NO"}`);

    if (!token) {
      console.log("[Auth Middleware] No token provided");
      return res.status(401).json({
        success: false,
        error: "No authorization token provided",
      });
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      console.log("[Auth Middleware] Invalid or expired token");
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Attach user info to request
    req.user = payload;
    req.token = token;

    console.log(`[Auth Middleware] ✅ User authenticated: ${payload.email} (userId: ${payload.userId})`);
    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
}


export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.get("Authorization"));

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        req.user = payload;
        req.token = token;
        console.log(
          `[Optional Auth Middleware] User authenticated: ${payload.email}`
        );
      }
    }

    next();
  } catch (error) {
    console.error("[Optional Auth Middleware] Error:", error);
    next(); // Continue anyway for optional auth
  }
}

/**
 * Require Auth - Helper function
 * Use in route handlers to ensure user is authenticated
 *
 * Usage: if (!requireAuth(req, res)) return;
 */
export function requireAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return false;
  }
  return true;
}
