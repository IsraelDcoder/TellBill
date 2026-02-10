import type { Express, Request, Response } from "express";
import { eq, sql, and } from "drizzle-orm";
import { users, invoices, projects, activityLog } from "@shared/schema";
import { db } from "./db";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "./utils/password";
import { sendWelcomeEmail, sendVerificationEmail } from "./emailService";
import { generateToken, verifyToken } from "./utils/jwt";
import { generateTokenPair, verifyAccessToken, verifyRefreshToken, generateAccessTokenFromRefresh } from "./services/tokenService";
import {
  validateSignup,
  validateLogin,
  sanitizeEmail,
  sanitizeString,
  respondWithValidationErrors,
} from "./utils/validation";
import { loginRateLimiter, signupRateLimiter, adaptiveLimiter } from "./utils/rateLimiter";
import { captureAuthError, setSentryUserContext, captureException } from "./utils/sentry";

interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  token?: string; // ✅ JWT token for authentication
  user?: {
    id: string;
    email: string;
    name?: string | null;
    companyName?: string | null;
    companyPhone?: string | null;
    companyEmail?: string | null;
    companyAddress?: string | null;
    companyWebsite?: string | null;
    companyTaxId?: string | null;
    createdAt: Date;
  };
  error?: string;
}

/**
 * ✅ AUTHENTICATION SYSTEM PRINCIPLES:
 *
 * 1. REAL USER IDENTITY:
 *    - Users MUST sign up with email + password before login
 *    - Each signup creates a unique, stable userId (UUID)
 *    - Same userId is returned on every login (permanent identity)
 *
 * 2. STRICT LOGIN REQUIREMENTS:
 *    - Login FAILS if email does not exist (401 Unauthorized)
 *    - Login FAILS if password does not match (401 Unauthorized)
 *    - Login NEVER auto-creates users
 *    - Login NEVER allows random email + password
 *
 * 3. PASSWORD SECURITY:
 *    - Passwords are hashed with bcrypt (never plaintext)
 *    - Password strength validated at signup
 *    - Password comparison uses bcrypt (never plaintext compare)
 *
 * 4. USER IDENTITY STABILITY:
 *    - User ID is unique (primary key: UUID)
 *    - User ID is stable (never changes across sessions)
 *    - Email is unique (users cannot have duplicate emails)
 *    - Email is normalized (lowercase, trimmed)
 */

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/signup
   * Register a new user with email and password
   *
   * REQUIREMENTS:
   * - User must provide email and password
   * - Email must be valid and not already registered
   * - Password must meet security requirements
   * - User ID is generated as stable UUID
   *
   * RESPONSES:
   * - 201 Created: New user successfully created
   * - 409 Conflict: Email already registered (user exists)
   * - 400 Bad Request: Invalid input or password requirements not met
   * - 429 Too Many Requests: Rate limit exceeded
   * - 500 Server Error: Database or system error
   *
   * AUTHENTICATION PRINCIPLE:
   * This endpoint creates a NEW USER IDENTITY.
   * Each successful signup creates exactly ONE new user with a unique ID.
   * This user can then log in with their email and password.
   */
  app.post("/api/auth/signup", signupRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body as SignUpRequest;

      // ✅ COMPREHENSIVE INPUT VALIDATION
      const validation = validateSignup(req.body);
      if (!validation.isValid) {
        captureException("Signup validation failed", {
          endpoint: "/api/auth/signup",
          errors: validation.errors,
        });
        return respondWithValidationErrors(res, validation.errors);
      }

      // NORMALIZE: Email to lowercase and trim whitespace
      // This ensures john@example.com and JOHN@EXAMPLE.COM are the same user
      const normalizedEmail = sanitizeEmail(email);
      const sanitizedName = name ? sanitizeString(name) : null;

      // VALIDATE: Password strength (enforced on backend, not frontend)
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        captureException("Password validation failed", {
          endpoint: "/api/auth/signup",
          errors: passwordValidation.errors,
        });
        return res.status(400).json({
          success: false,
          error: "Password does not meet security requirements",
          details: passwordValidation.errors,
        } as AuthResponse);
      }

      // CHECK: Email must not already exist in database
      // ✅ This prevents duplicate user accounts
      // ✅ If email exists, user must use login endpoint instead
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Email already registered",
        } as AuthResponse);
      }

      // HASH: Password using bcrypt (never store plaintext)
      // ✅ This ensures password security even if database is compromised
      const hashedPassword = await hashPassword(password);

      // CREATE: New user with stable UUID
      // ✅ User ID is generated automatically as UUID
      // ✅ User ID is permanent and unique
      // ✅ Same user always gets same ID across sessions
      const newUser = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          password: hashedPassword,
          name: sanitizedName,
        })
        .returning();

      if (!newUser || newUser.length === 0) {
        return res.status(500).json({
          success: false,
          error: "Failed to create user",
        } as AuthResponse);
      }

      const user = newUser[0];

      // ✅ GENERATE JWT TOKENS (access + refresh)
      const { accessToken, refreshToken, accessTokenExpiresIn } = generateTokenPair(
        user.id,
        user.email
      );

      // ✅ GENERATE EMAIL VERIFICATION TOKEN (valid for 24 hours)
      const verificationToken = generateToken(user.id, user.email);

      // Set user context in Sentry for error tracking
      setSentryUserContext(user.id, user.email);

      // Send verification email (async, don't block signup)
      const appUrl = process.env.EXPO_PUBLIC_APP_URL || "https://tellbill.app";
      sendVerificationEmail(user.email, verificationToken, appUrl).catch((error) => {
        console.error("[Auth] Failed to send verification email:", error);
        captureException(error as Error, { 
          endpoint: "/api/auth/signup",
          operation: "send_verification_email",
          userId: user.id,
        });
        // Don't throw - signup succeeded, email is just a courtesy
      });

      // Send welcome email (async, don't block signup)
      sendWelcomeEmail(user.email, user.name || "User").catch((error) => {
        console.error("[Auth] Failed to send welcome email:", error);
        captureException(error as Error, { 
          endpoint: "/api/auth/signup",
          operation: "send_welcome_email",
          userId: user.id,
        });
        // Don't throw - signup succeeded, email is just a courtesy
      });

      return res.status(201).json({
        success: true,
        accessToken, // ✅ 15-minute access token
        refreshToken, // ✅ 7-day refresh token
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        message: "Signup successful! Check your email to verify your account.",
        requiresVerification: true,
        accessTokenExpiresIn: 15 * 60, // 15 minutes in seconds
      } as AuthResponse);
    } catch (error) {
      console.error("[Auth] Signup error:", error);
      captureException(error as Error, { endpoint: "/api/auth/signup" });
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      } as AuthResponse);
    }
  });


  app.post("/api/auth/login", loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as SignInRequest;

      // ✅ COMPREHENSIVE INPUT VALIDATION
      const validation = validateLogin(req.body);
      if (!validation.isValid) {
        return respondWithValidationErrors(res, validation.errors);
      }

      // NORMALIZE: Email to lowercase and trim whitespace
      // Ensures john@example.com and JOHN@EXAMPLE.COM authenticate to same user
      const normalizedEmail = sanitizeEmail(email);

      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);


      if (userResult.length === 0) {
        // Capture authentication failure
        captureAuthError("invalid_credentials", normalizedEmail, req.ip || "unknown");
        

        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        } as AuthResponse);
      }

      const user = userResult[0];

      // ✅ CHECK: Account lockout (if locked, reject immediately)
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000
        );
        console.log(`[Auth] Account locked for ${normalizedEmail}, ${minutesRemaining} minutes remaining`);
        
        return res.status(429).json({
          success: false,
          error: `Account is temporarily locked. Please try again in ${minutesRemaining} minutes.`,
        });
      }

      // VERIFY: Password matches stored hash using bcrypt
      // ✅ Never compares plaintext passwords
      // ✅ Secure password verification
      const passwordMatches = await comparePassword(password, user.password);

      // STRICT: Fail if password does not match
      // ✅ This prevents login with wrong password
      if (!passwordMatches) {
        // ✅ INCREMENT failed login attempts
        const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
        let lockUntil = null;

        // ✅ LOCK ACCOUNT after 5 failed attempts for 30 minutes
        if (newFailedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          console.log(`[Auth] Account locked after 5 failed attempts: ${normalizedEmail}`);
        }

        // Update failed attempts and lock status
        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lockedUntil: lockUntil,
          })
          .where(eq(users.id, user.id));

        // Capture authentication failure
        captureAuthError("invalid_credentials", normalizedEmail, req.ip || "unknown");
        
        // Return appropriate error message
        if (lockUntil) {
          return res.status(429).json({
            success: false,
            error: "Account locked after 5 failed attempts. Try again in 30 minutes.",
          });
        }

        const attemptsRemaining = Math.max(0, 5 - newFailedAttempts);
        return res.status(401).json({
          success: false,
          error: `Invalid email or password. ${attemptsRemaining} attempts remaining before account lock.`,
        });
      }

      // ✅ PASSWORD CORRECT: Reset failed attempts and unlock account
      await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, user.id));

      // SUCCESS: Return existing user with stable ID
      // ✅ Returns the SAME user ID that was created at signup
      // ✅ User ID is permanent and unique
      // ✅ This is the user's identity for all future operations
      
      // ✅ GENERATE JWT TOKENS (access + refresh)
      const { accessToken, refreshToken, accessTokenExpiresIn } = generateTokenPair(
        user.id,
        user.email
      );
      
      // Set user context in Sentry for error tracking
      setSentryUserContext(user.id, user.email);
      
      return res.status(200).json({
        success: true,
        accessToken, // ✅ 15-minute access token
        refreshToken, // ✅ 7-day refresh token
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName || null,
          companyPhone: user.companyPhone || null,
          companyEmail: user.companyEmail || null,
          companyAddress: user.companyAddress || null,
          companyWebsite: user.companyWebsite || null,
          companyTaxId: user.companyTaxId || null,
          createdAt: user.createdAt,
        },
        accessTokenExpiresIn: 15 * 60, // 15 minutes in seconds
      } as AuthResponse);
    } catch (error) {
      console.error("[Auth] Login error:", error);
      captureException(error as Error, { endpoint: "/api/auth/login" });
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      } as AuthResponse);
    }
  });

  /**
   * GET /api/auth/user/:userId
   * Get current user data and profile
   * Used after login to restore user state
   */
  app.get("/api/auth/user/:userId", async (req: Request, res: Response) => {
    try {
      let { userId } = req.params;
      
      // Ensure userId is a string (not array)
      if (Array.isArray(userId)) {
        userId = userId[0];
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Get user from database
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId as string))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const user = userResult[0];

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          companyPhone: user.companyPhone,
          companyEmail: user.companyEmail,
          companyAddress: user.companyAddress,
          companyWebsite: user.companyWebsite,
          companyTaxId: user.companyTaxId,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("[Auth] Get user error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  /**
   * PUT /api/auth/company-info
   * Update user's company information
   * - Requires user ID in request body
   * - Updates company fields in database
   * - Returns updated user data
   */
  app.put("/api/auth/company-info", async (req: Request, res: Response) => {
    try {
      const {
        userId,
        companyName,
        companyPhone,
        companyEmail,
        companyAddress,
        companyWebsite,
        companyTaxId,
      } = req.body;

      // Validate input
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Check if user exists
      const userExists = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Update company info
      const updatedUser = await db
        .update(users)
        .set({
          companyName: companyName || null,
          companyPhone: companyPhone || null,
          companyEmail: companyEmail || null,
          companyAddress: companyAddress || null,
          companyWebsite: companyWebsite || null,
          companyTaxId: companyTaxId || null,
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({
          success: false,
          error: "Failed to update company information",
        });
      }

      const user = updatedUser[0];

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          companyPhone: user.companyPhone,
          companyEmail: user.companyEmail,
          companyAddress: user.companyAddress,
          companyWebsite: user.companyWebsite,
          companyTaxId: user.companyTaxId,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("[Auth] Company info update error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  /**
   * POST /api/auth/google
   * Google OAuth sign-in/sign-up
   * Exchanges Google token for user account (creates if doesn't exist)
   */
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { googleToken, idToken } = req.body;

      if (!googleToken && !idToken) {
        return res.status(400).json({
          success: false,
          error: "Missing Google token",
        });
      }

      // ✅ VERIFY GOOGLE TOKEN
      // In production, you'd verify the token with Google's API
      // For now, we'll decode the idToken to get user info
      // Example: const decoded = await verifyGoogleToken(idToken);
      
      // Mock decoding (in production, use google-auth-library)
      let googleUserEmail: string | null = null;
      let googleUserName: string | null = null;

      // Try to decode JWT (basic decode, not verifying signature)
      try {
        if (idToken) {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            googleUserEmail = decoded.email;
            googleUserName = decoded.name;
          }
        }
      } catch (e) {
        console.error("[Auth] Error decoding Google token:", e);
      }

      if (!googleUserEmail) {
        return res.status(400).json({
          success: false,
          error: "Could not extract email from Google token",
        });
      }

      // ✅ EXISTING USER: Check if user with this email exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUserEmail))
        .limit(1);

      if (existingUser.length > 0) {
        // User exists - return existing user (login)
        const user = existingUser[0];
        console.log("[Auth] Google login for existing user:", googleUserEmail);

        return res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            companyName: user.companyName,
            companyPhone: user.companyPhone,
            companyEmail: user.companyEmail,
            companyAddress: user.companyAddress,
            companyWebsite: user.companyWebsite,
            companyTaxId: user.companyTaxId,
            createdAt: user.createdAt,
          },
        });
      }

      // ✅ NEW USER: Create user account
      const newUser = await db
        .insert(users)
        .values({
          email: googleUserEmail,
          name: googleUserName,
          password: "", // No password for OAuth users
        })
        .returning();

      if (!newUser || newUser.length === 0) {
        return res.status(500).json({
          success: false,
          error: "Failed to create user account",
        });
      }

      const createdUser = newUser[0];
      console.log("[Auth] New Google user created:", googleUserEmail);

      // Send welcome email
      sendWelcomeEmail(createdUser.email, createdUser.name || "User").catch((err) => {
        console.error("[Auth] Failed to send welcome email:", err);
      });

      return res.status(201).json({
        success: true,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          companyName: createdUser.companyName,
          companyPhone: createdUser.companyPhone,
          companyEmail: createdUser.companyEmail,
          companyAddress: createdUser.companyAddress,
          companyWebsite: createdUser.companyWebsite,
          companyTaxId: createdUser.companyTaxId,
          createdAt: createdUser.createdAt,
        },
      });
    } catch (error) {
      console.error("[Auth] Google sign-in error:", error);
      return res.status(500).json({
        success: false,
        error: "Google authentication failed",
      });
    }
  });

  /**
   * GET /api/auth/verify
   * Verify JWT token and restore user session
   * 
   * Used for:
   * - Session restoration on app launch (if token in AsyncStorage)
   * - Checking if stored token is still valid
   * - Returning fresh user data for session restoration
   * 
   * Returns:
   * - 200 OK: Token is valid, user data included
   * - 401 Unauthorized: Token is invalid or expired
   */
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      // Extract JWT from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          error: "No token provided",
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      // Verify token validity using jwt utility
      const payload = verifyToken(token);
      
      if (!payload || !payload.userId) {
        console.log("[Auth] Token verification failed - invalid or expired token");
        return res.status(401).json({
          success: false,
          error: "Invalid or expired token",
        });
      }

      // ✅ Token is valid - fetch current user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || user.length === 0) {
        console.log("[Auth] User not found for token:", payload.userId);
        return res.status(401).json({
          success: false,
          error: "User not found",
        });
      }

      const currentUser = user[0];
      
      // ✅ Query subscription data for this user
      const invoiceCountResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(invoices)
        .where(eq(invoices.userId, payload.userId));
      
      const projectCountResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(projects)
        .where(eq(projects.userId, payload.userId));

      // ✅ Count voice recordings from activity log
      const voiceRecordingCountResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(activityLog)
        .where(and(eq(activityLog.userId, payload.userId), eq(activityLog.action, "transcribed_voice")));

      const invoiceCount = invoiceCountResult[0]?.count || 0;
      const projectCount = projectCountResult[0]?.count || 0;
      const voiceRecordingCount = voiceRecordingCountResult[0]?.count || 0;

      console.log("[Auth] ✅ Token verified for user:", currentUser.email);
      console.log("[Auth] Usage counts - Invoices:", invoiceCount, "Projects:", projectCount, "Voice Recordings:", voiceRecordingCount);

      return res.status(200).json({
        success: true,
        user: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          companyName: currentUser.companyName,
          companyPhone: currentUser.companyPhone,
          companyEmail: currentUser.companyEmail,
          companyAddress: currentUser.companyAddress,
          companyWebsite: currentUser.companyWebsite,
          companyTaxId: currentUser.companyTaxId,
          createdAt: currentUser.createdAt,
        },
        subscription: {
          userEntitlement: currentUser.currentPlan || "free",
          subscription: null,
          currentPlan: currentUser.currentPlan || "free",
          isSubscribed: currentUser.isSubscribed || false,
          invoicesCreated: invoiceCount,
          projectsCreated: projectCount,
          projectsAccessed: 0, // TODO: Track project access in activity log
          voiceRecordingsUsed: 0, // TODO: Track from activity log
        },
      });
    } catch (error) {
      console.error("[Auth] Verification error:", error);
      console.error("[Auth] Error type:", error instanceof Error ? error.message : String(error));
      console.error("[Auth] Full error:", JSON.stringify(error, null, 2));
      return res.status(500).json({
        success: false,
        error: "Token verification failed",
      });
    }
  });

  /**
   * GET /api/auth/verify-email
   * Verify user email address using verification token
   * Called when user clicks link in verification email
   * 
   * FLOW:
   * 1. User receives email with verification link
   * 2. Link contains JWT token with userId scoped to "email-verification"
   * 3. Frontend calls this endpoint with token
   * 4. Backend verifies token and marks email as verified
   * 5. User account is now active
   */
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          error: "Verification token is required",
        });
      }

      // ✅ VERIFY the token using JWT verification
      const payload = verifyToken(token);
      
      if (!payload || !payload.userId) {
        console.log("[Auth] Email verification failed - invalid token");
        return res.status(400).json({
          success: false,
          error: "Invalid or expired verification token",
        });
      }

      // ✅ MARK EMAIL AS VERIFIED in database
      const updatedUser = await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, payload.userId as string))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        console.log("[Auth] User not found for email verification:", payload.userId);
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const user = updatedUser[0];
      console.log(`[Auth] ✅ Email verified for user: ${user.email}`);

      return res.status(200).json({
        success: true,
        message: "Email verified successfully! Your account is now active.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("[Auth] Email verification error:", error);
      captureException(error as Error, { endpoint: "/api/auth/verify-email" });
      return res.status(500).json({
        success: false,
        error: "Email verification failed",
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh JWT access token using refresh token
   * Called when access token expires but refresh token is still valid
   * 
   * SECURITY:
   * - Access token: 15 minutes (short-lived)
   * - Refresh token: 7 days (long-lived)
   * - Use refresh token only to get new access token
   * - Never use refresh token for API calls
   * 
   * FLOW:
   * 1. Frontend stores refresh token securely (httpOnly cookie or secure storage)
   * 2. When access token expires (401 response)
   * 3. Frontend calls /api/auth/refresh with refresh token
   * 4. Backend generates new access token
   * 5. Frontend retries original request with new access token
   */
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== "string") {
        return res.status(400).json({
          success: false,
          error: "Refresh token is required",
        });
      }

      // ✅ VERIFY refresh token
      const payload = verifyRefreshToken(refreshToken);
      if (!payload || !payload.userId) {
        console.log("[Auth] Refresh token verification failed");
        return res.status(401).json({
          success: false,
          error: "Invalid or expired refresh token",
        });
      }

      // ✅ GENERATE NEW ACCESS TOKEN
      const newAccessToken = generateAccessTokenFromRefresh(refreshToken);
      if (!newAccessToken) {
        console.log("[Auth] Failed to generate new access token");
        return res.status(401).json({
          success: false,
          error: "Failed to refresh token",
        });
      }

      // ✅ OPTIONAL: Generate new refresh token (token rotation)
      // This is more secure but requires updating refresh token in client
      // For now, we'll reuse the same refresh token
      // const { refreshToken: newRefreshToken } = generateTokenPair(payload.userId, "");

      console.log(`[Auth] ✅ Token refreshed for user: ${payload.userId}`);

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        accessTokenExpiresIn: 15 * 60, // 15 minutes in seconds
        message: "Token refreshed successfully",
      });
    } catch (error) {
      console.error("[Auth] Token refresh error:", error);
      captureException(error as Error, { endpoint: "/api/auth/refresh" });
      return res.status(500).json({
        success: false,
        error: "Token refresh failed",
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout user (invalidate refresh token)
   * 
   * OPTIONAL: Currently uses stateless JWT tokens, so refresh token is invalidated
   * on the client side. To implement server-side logout, create a token blacklist table.
   * 
   * FLOW:
   * 1. Frontend deletes stored refresh token (local storage or cookie)
   * 2. Optionally calls this endpoint to notify server
   * 3. On access token expiry, user forced to login again
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const refreshToken = req.body?.refreshToken;

      // ✅ Just confirm logout (client has already discarded tokens)
      // In a more secure implementation, we would blacklist the refresh token here
      // For now, tokens are stateless (auth is only valid until token expires)

      return res.status(200).json({
        success: true,
        message: "Logged out successfully. Please delete stored tokens on client.",
      });
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      return res.status(200).json({
        success: true,
        message: "Logout processed",
      });
    }
  });
}
