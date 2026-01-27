import { Request, Response, NextFunction } from "express";

/**
 * ✅ RATE LIMITING SYSTEM
 * Protects against brute force, DOS, and abuse
 */

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting
  onLimitReached?: (req: Request, key: string) => void; // Callback when limit reached
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter
 * Stores request counts per key (IP address or user ID)
 */
class RateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   */
  isAllowed(key: string, options: RateLimitOptions): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    // First request or window expired
    if (!record || now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return true;
    }

    // Within window, increment count
    record.count++;

    // Check if exceeded limit
    if (record.count > options.maxRequests) {
      return false;
    }

    return true;
  }

  /**
   * Get current count for a key
   */
  getCount(key: string): number {
    const record = this.store.get(key);
    if (!record) return 0;

    // Check if expired
    if (Date.now() > record.resetTime) {
      this.store.delete(key);
      return 0;
    }

    return record.count;
  }

  /**
   * Get remaining time until reset (in seconds)
   */
  getResetTime(key: string): number {
    const record = this.store.get(key);
    if (!record) return 0;

    const remaining = record.resetTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Reset count for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Destroy rate limiter and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limiter instance
const globalLimiter = new RateLimiter();

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if configured
    if (options.skip && options.skip(req)) {
      return next();
    }

    // Generate key (default: IP address)
    const key =
      (options.keyGenerator && options.keyGenerator(req)) ||
      req.ip ||
      "unknown";

    // Check rate limit
    const isAllowed = globalLimiter.isAllowed(key, options);

    if (!isAllowed) {
      const resetTime = globalLimiter.getResetTime(key);
      const message =
        options.message ||
        `Too many requests, please try again in ${resetTime} seconds`;

      // Call callback if provided
      if (options.onLimitReached) {
        options.onLimitReached(req, key);
      }

      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message,
        retryAfter: resetTime,
      });
    }

    // Set rate limit headers
    const count = globalLimiter.getCount(key);
    const resetTime = globalLimiter.getResetTime(key);

    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", options.maxRequests - count);
    res.setHeader("X-RateLimit-Reset", resetTime);

    next();
  };
}

/**
 * Pre-configured rate limiters
 */

// 5 attempts per minute on login
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: "Too many login attempts, please try again in 1 minute",
  onLimitReached: (req, key) => {
    console.warn(`[RateLimit] Login limit exceeded for IP: ${key}`);
  },
});

// 3 attempts per minute on signup
export const signupRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3,
  message: "Too many signup attempts, please try again in 1 minute",
  onLimitReached: (req, key) => {
    console.warn(`[RateLimit] Signup limit exceeded for IP: ${key}`);
  },
});

// 10 attempts per hour on payment initiation
export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: "Too many payment attempts, please try again later",
  keyGenerator: (req) => {
    // Use userId if authenticated, otherwise use IP
    if (req.user && req.user.userId) {
      return `payment-${req.user.userId}`;
    }
    return `payment-${req.ip}`;
  },
  onLimitReached: (req, key) => {
    console.warn(`[RateLimit] Payment limit exceeded for: ${key}`);
  },
});

// 20 attempts per minute on webhook (permissive, for Flutterwave retries)
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  keyGenerator: (req) => {
    // Use reference from webhook as key
    const reference = req.body?.data?.tx_ref;
    if (reference) {
      return `webhook-${reference}`;
    }
    return `webhook-${req.ip}`;
  },
});

/**
 * Advanced rate limiter with sliding window
 * More accurate than fixed window
 */
export class SlidingWindowRateLimiter {
  private store: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.store.get(key) || [];

    // Remove expired timestamps
    const validTimestamps = timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    if (validTimestamps.length < this.maxRequests) {
      validTimestamps.push(now);
      this.store.set(key, validTimestamps);
      return true;
    }

    return false;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const timestamps = this.store.get(key) || [];

    const validTimestamps = timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  getResetTime(key: string): number {
    const timestamps = this.store.get(key);
    if (!timestamps || timestamps.length === 0) return 0;

    const oldestTimestamp = Math.min(...timestamps);
    const resetTime = oldestTimestamp + this.windowMs - Date.now();
    return Math.max(0, Math.ceil(resetTime / 1000));
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on request patterns
 * Increases rate limit for trusted users, decreases for suspicious patterns
 */
export class AdaptiveRateLimiter {
  private baseLimiter: RateLimiter;
  private suspiciousPatterns: Map<string, number> = new Map();
  private trustedUsers: Set<string> = new Set();

  constructor() {
    this.baseLimiter = new RateLimiter();
  }

  /**
   * Check request with adaptive limits
   */
  isAllowed(key: string, baseOptions: RateLimitOptions): boolean {
    // Check if user has suspicious pattern
    if (this.suspiciousPatterns.has(key)) {
      const suspicionLevel = this.suspiciousPatterns.get(key) || 1;
      const adjustedOptions = {
        ...baseOptions,
        maxRequests: Math.max(1, Math.floor(baseOptions.maxRequests / suspicionLevel)),
      };
      return this.baseLimiter.isAllowed(key, adjustedOptions);
    }

    // Check if trusted user
    if (this.trustedUsers.has(key)) {
      const adjustedOptions = {
        ...baseOptions,
        maxRequests: Math.floor(baseOptions.maxRequests * 1.5),
      };
      return this.baseLimiter.isAllowed(key, adjustedOptions);
    }

    // Normal rate limit
    return this.baseLimiter.isAllowed(key, baseOptions);
  }

  /**
   * Mark user as suspicious
   */
  markSuspicious(key: string, level: number = 1): void {
    const current = this.suspiciousPatterns.get(key) || 1;
    this.suspiciousPatterns.set(key, current + level);
    console.warn(`[RateLimit] User marked suspicious: ${key} (level: ${current + level})`);
  }

  /**
   * Mark user as trusted
   */
  markTrusted(key: string): void {
    this.trustedUsers.add(key);
    console.log(`[RateLimit] User marked trusted: ${key}`);
  }

  /**
   * Reset suspicion
   */
  resetSuspicion(key: string): void {
    this.suspiciousPatterns.delete(key);
  }
}

// Export global adaptive limiter
export const adaptiveLimiter = new AdaptiveRateLimiter();
