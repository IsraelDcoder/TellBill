/**
 * Token Service - Manages JWT access tokens and refresh tokens
 * 
 * SECURITY STRATEGY:
 * - Access token: Short-lived (15 minutes), used for API calls
 * - Refresh token: Long-lived (7 days), stored in httpOnly cookies or secure storage
 * - Refresh token rotation: Optional - new refresh token on each refresh
 */

import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { createHash } from "crypto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
  refreshTokenExpiresIn: number; // seconds
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: "refresh";
  tokenId?: string; // For refresh token rotation
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key-change-in-production";

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(userId: string, email: string): TokenPair {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets not configured");
  }

  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    {
      userId,
      email,
      type: "access",
    } as AccessTokenPayload,
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: "HS256",
    }
  );

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(
    {
      userId,
      type: "refresh",
    } as RefreshTokenPayload,
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: "HS256",
    }
  );

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: 15 * 60, // 15 minutes in seconds
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
    
    // Ensure it's an access token
    if (payload.type !== "access") {
      throw new Error("Invalid token type - expected access token");
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("[TokenService] Access token expired");
      return null;
    }
    console.error("[TokenService] Access token verification failed:", error);
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    if (!JWT_REFRESH_SECRET) {
      throw new Error("JWT_REFRESH_SECRET not configured");
    }

    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    
    // Ensure it's a refresh token
    if (payload.type !== "refresh") {
      throw new Error("Invalid token type - expected refresh token");
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log("[TokenService] Refresh token expired");
      return null;
    }
    console.error("[TokenService] Refresh token verification failed:", error);
    return null;
  }
}

/**
 * Generate a new access token from refresh token
 * Use when access token expires but refresh token is still valid
 */
export function generateAccessTokenFromRefresh(refreshToken: string): string | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  const newAccessToken = jwt.sign(
    {
      userId: payload.userId,
      type: "access",
    } as AccessTokenPayload,
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: "HS256",
    }
  );

  return newAccessToken;
}

/**
 * Hash a refresh token for database storage
 * Used if storing refresh tokens in database for revocation
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a hashed refresh token
 */
export function verifyHashedRefreshToken(token: string, hash: string): boolean {
  return hashRefreshToken(token) === hash;
}

/**
 * Decode token without verification (use with caution!)
 * Only for debugging or reading claims before verification
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}
