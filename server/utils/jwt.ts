import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d"; // 7 days default

/**
 * JWT Token Payload Interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user authentication
 * @param userId - User ID from database
 * @param email - User email
 * @returns Signed JWT token
 */
export function generateToken(userId: string, email: string): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const token = jwt.sign(
    {
      userId,
      email,
    } as JwtPayload,
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRY,
      algorithm: "HS256",
    }
  );

  console.log(`[JWT] Generated token for user: ${email}`);
  return token;
}

/**
 * Verify JWT token and return payload
 * @param token - JWT token to verify
 * @returns Decoded payload if valid, null if invalid/expired
 */
export function verifyToken(token: string): JwtPayload | null {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;

    console.log(`[JWT] Token verified for user: ${decoded.email}`);
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("[JWT] Token expired");
      return null;
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log("[JWT] Invalid token signature or format");
      return null;
    }
    console.error("[JWT] Token verification error:", error);
    return null;
  }
}

/**
 * Decode token without verification (unsafe - use only for inspection)
 * @param token - JWT token to decode
 * @returns Decoded payload without verification
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch (error) {
    console.error("[JWT] Token decode error:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value (e.g., "Bearer token123")
 * @returns Token if valid format, null otherwise
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    console.log("[JWT] Invalid authorization header format");
    return null;
  }

  return parts[1];
}
