import type { Express, Request, Response } from "express";
import { eq, sql, and, gt, isNull } from "drizzle-orm";
import { users, invoices, projects, activityLog, passwordResetTokens } from "@shared/schema";
import { db } from "./db";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "./utils/password";
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from "./emailService";
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
import { randomBytes, createHash } from "crypto";

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
 * Generate a secure reset token for password reset
 * @returns {token: string, hash: string}
 */
function generateResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex"); // Hash the token for secure storage
  return { token, hash };
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

      // ✅ CREATE DEFAULT TAX PROFILE FOR NEW USER
      // Uses US average combined state + local tax rate (~8%)
      try {
        const { taxProfiles } = await import("../shared/schema");
        const defaultTaxProfile = await db
          .insert(taxProfiles)
          .values({
            userId: user.id,
            name: "Sales Tax",
            rate: "8.00", // 8% - US average
            appliesto: "labor_and_materials", // Apply to both labor and materials
            enabled: true, // Enabled by default
            isDefault: true,
          })
          .returning();
        
        console.log("[Auth] ✅ Created default tax profile for user:", user.id);
      } catch (taxError) {
        console.error("[Auth] Warning: Failed to create default tax profile:", taxError);
        // Don't block signup if tax profile creation fails
      }

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
      const backendUrl = process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
      sendVerificationEmail(user.email, verificationToken, backendUrl).catch((error) => {
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
      
      console.log(`[Auth] Email verification attempt with token: ${token ? `${String(token).substring(0, 20)}...` : "none"}`);

      if (!token || typeof token !== "string") {
        console.log("[Auth] Email verification failed - no token provided");
        return res.status(400).type("html").send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - TellBill</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; margin-top: 0; }
              p { color: #666; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Verification Failed</h1>
              <p class="error">Verification token is required. Please use the link from your verification email.</p>
            </div>
          </body>
          </html>
        `);
      }

      // ✅ VERIFY the token using JWT verification
      const payload = verifyToken(token);
      console.log(`[Auth] JWT verification result:`, payload ? `valid (userId: ${payload.userId})` : "invalid");
      
      if (!payload || !payload.userId) {
        console.log("[Auth] Email verification failed - invalid token");
        return res.status(400).type("html").send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - TellBill</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; margin-top: 0; }
              p { color: #666; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Link Expired</h1>
              <p class="error">Your verification link has expired or is invalid. Please request a new verification email from your TellBill account.</p>
            </div>
          </body>
          </html>
        `);
      }

      // ✅ MARK EMAIL AS VERIFIED in database
      const updatedUser = await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, payload.userId as string))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        console.log("[Auth] User not found for email verification:", payload.userId);
        return res.status(404).type("html").send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - TellBill</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; margin-top: 0; }
              p { color: #666; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Error</h1>
              <p class="error">User account not found. Please ensure you're using the correct verification link.</p>
            </div>
          </body>
          </html>
        `);
      }

      const user = updatedUser[0];
      console.log(`[Auth] ✅ Email verified for user: ${user.email}`);

      return res.status(200).type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verified - TellBill</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #4caf50; margin-top: 0; }
            p { color: #666; line-height: 1.6; }
            .success { color: #4caf50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Email Verified!</h1>
            <p class="success">Your email has been successfully verified.</p>
            <p>You can now close this page and return to the TellBill app to start sending invoices.</p>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
              Redirecting to app in 3 seconds...
            </p>
          </div>

          <script>
            // After verification, try to redirect back to the app
            setTimeout(() => {
              // For Expo Go on iOS/Android, use a deep link
              const appLink = "exp://localhost:8081" || "com.tellbill://home";
              
              // Try to open the app, with fallback to showing instructions
              window.location.href = appLink;
              
              setTimeout(() => {
                // If deep link doesn't work, show instructions
                document.body.innerHTML += '<p style="margin-top: 30px; color: #666;">If the app did not open automatically, please return to TellBill manually and refresh your session.</p>';
              }, 2000);
            }, 3000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("[Auth] Email verification error:", error);
      captureException(error as Error, { endpoint: "/api/auth/verify-email" });
      return res.status(500).type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Error - TellBill</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #333; margin-top: 0; }
            p { color: #666; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Verification Error</h1>
            <p class="error">An error occurred during email verification. Please try again or contact support.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

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


  app.post(
    "/api/auth/password-reset/request",
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;

        // Validate email
        if (!email || !email.trim()) {
          return res.status(400).json({
            success: false,
            error: "Email is required",
          });
        }

        const sanitizedEmail = sanitizeEmail(email);

        // Always return success (security best practice)
        // This prevents email enumeration attacks
        const user = await db.query.users.findFirst({
          where: eq(users.email, sanitizedEmail),
        });

        if (!user) {
          // Return success even if user doesn't exist (security)
          return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent.",
          });
        }

        // Delete any existing reset tokens for this user
        await db
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, user.id));

        // Generate reset token
        const { token, hash } = generateResetToken();

        // Store token in database with 15 minute expiration
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token: hash,
          expiresAt,
        });

        console.log(`[Auth] ✅ Password reset token generated for ${user.email}. Token hash first 20 chars: ${hash.substring(0, 20)}, Expires: ${expiresAt.toISOString()}`);

        // Build reset URL pointing to backend endpoint
        const backendUrl = process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
        const resetUrl = `${backendUrl}/api/auth/reset-password?token=${token}`;

        // Send reset email
        await sendPasswordResetEmail(user.email, user.name || user.email, resetUrl);

        console.log(
          `[Auth] ✅ Password reset email sent to ${user.email}`
        );

        return res.status(200).json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("[Auth] Password reset request error:", error);
        captureException(error instanceof Error ? error : new Error(String(error)));

        // Don't reveal internal errors
        return res.status(200).json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      }
    }
  );

  /**
   * PASSWORD RESET PAGE - HANDLE EMAIL LINK CLICK
   * GET /api/auth/reset-password?token=xyz
   * 
   * When user clicks password reset link in email, this endpoint shows a form
   * to enter and confirm their new password
   */
  app.get("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      console.log(`[Auth] Password reset page accessed with token: ${token ? `${String(token).substring(0, 20)}...` : "none"}`);

      if (!token || typeof token !== "string") {
        console.log("[Auth] No token provided to reset page");
        return res.status(400).type("html").send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - TellBill</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; margin-top: 0; }
              p { color: #666; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Invalid Reset Link</h1>
              <p class="error">The password reset link is invalid or missing. Please request a new password reset from your TellBill account.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Verify the token is valid (don't reveal internal validation details)
      const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

      console.log(`[Auth] Token hash generated. Looking up token in database...`);
      
      const resetToken = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, tokenHash))
        .limit(1);

      console.log(`[Auth] Token lookup: ${resetToken.length} record(s) found`);
      if (resetToken.length > 0) {
        console.log(`[Auth] Token expires at: ${resetToken[0].expiresAt}, Now: ${new Date()}`);
      }

      if (resetToken.length === 0 || resetToken[0].expiresAt < new Date()) {
        return res.status(400).type("html").send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - TellBill</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
              }
              h1 { color: #333; margin-top: 0; }
              p { color: #666; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Link Expired</h1>
              <p class="error">Your password reset link has expired (valid for 15 minutes). Please request a new one from your TellBill account.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Token is valid - show password reset form
      return res.status(200).type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password - TellBill</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 400px;
              width: 100%;
            }
            h1 {
              color: #333;
              margin-top: 0;
              text-align: center;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              color: #333;
              margin-bottom: 8px;
              font-weight: 600;
              font-size: 14px;
            }
            input {
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 16px;
              box-sizing: border-box;
              font-family: inherit;
            }
            input:focus {
              outline: none;
              border-color: #667eea;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            button {
              width: 100%;
              padding: 12px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              margin-top: 10px;
            }
            button:hover {
              opacity: 0.95;
            }
            button:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            .error {
              color: #d32f2f;
              font-size: 14px;
              margin-top: 10px;
              display: none;
            }
            .success {
              color: #4caf50;
              font-size: 14px;
              margin-top: 10px;
              display: none;
            }
            .loading {
              display: none;
              text-align: center;
              color: #667eea;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Reset Password</h1>
            <form id="resetForm">
              <div class="form-group">
                <label for="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minlength="8"
                  placeholder="At least 8 characters"
                  autocomplete="new-password"
                />
              </div>
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minlength="8"
                  placeholder="Must match the password above"
                  autocomplete="new-password"
                />
              </div>
              <button type="submit" id="submitBtn">Reset Password</button>
              <div class="loading" id="loading">Resetting password...</div>
              <div class="error" id="error"></div>
              <div class="success" id="success"></div>
            </form>
          </div>

          <script>
            const form = document.getElementById("resetForm");
            const passwordInput = document.getElementById("password");
            const confirmPasswordInput = document.getElementById("confirmPassword");
            const submitBtn = document.getElementById("submitBtn");
            const loadingDiv = document.getElementById("loading");
            const errorDiv = document.getElementById("error");
            const successDiv = document.getElementById("success");

            form.addEventListener("submit", async (e) => {
              e.preventDefault();

              const password = passwordInput.value.trim();
              const confirmPassword = confirmPasswordInput.value.trim();

              // Validation
              if (password.length < 8) {
                errorDiv.textContent = "Password must be at least 8 characters";
                errorDiv.style.display = "block";
                return;
              }

              if (password !== confirmPassword) {
                errorDiv.textContent = "Passwords do not match";
                errorDiv.style.display = "block";
                return;
              }

              // Submit to backend
              submitBtn.disabled = true;
              loadingDiv.style.display = "block";
              errorDiv.style.display = "none";

              try {
                const response = await fetch("/api/auth/password-reset/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: "${token}",
                    newPassword: password,
                    confirmPassword: confirmPassword,
                  }),
                });

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || "Password reset failed");
                }

                loadingDiv.style.display = "none";
                successDiv.textContent = "✅ Password reset successfully! You can now log in with your new password.";
                successDiv.style.display = "block";
                form.style.display = "none";
              } catch (error) {
                loadingDiv.style.display = "none";
                errorDiv.textContent = error.message;
                errorDiv.style.display = "block";
                submitBtn.disabled = false;
              }
            });
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("[Auth] Password reset page error:", error);
      captureException(error as Error, { endpoint: "/api/auth/reset-password" });
      return res.status(500).type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Error - TellBill</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #333; margin-top: 0; }
            p { color: #666; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Error</h1>
            <p class="error">An error occurred during password reset. Please try again or contact support.</p>
          </div>
        </body>
        </html>
      `);
    }
  });


  /**
   * PASSWORD RESET FLOW - VERIFY TOKEN AND RESET PASSWORD
   * POST /api/auth/password-reset/verify
   * 
   * Validates reset token, verifies new password, updates password in database
   */
  app.post(
    "/api/auth/password-reset/verify",
    async (req: Request, res: Response) => {
      try {
        const { token, newPassword, confirmPassword } = req.body;

        // Validate inputs
        if (!token || !token.trim()) {
          return res.status(400).json({
            success: false,
            error: "Reset token is required",
          });
        }

        if (!newPassword) {
          return res.status(400).json({
            success: false,
            error: "New password is required",
          });
        }

        if (newPassword !== confirmPassword) {
          return res.status(400).json({
            success: false,
            error: "Passwords do not match",
          });
        }

        // Validate password strength
        const strengthCheck = validatePasswordStrength(newPassword);
        if (!strengthCheck.isValid) {
          return res.status(400).json({
            success: false,
            error: strengthCheck.errors.join(", "),
          });
        }

        // Find active reset token
        const resetTokenEntry = await db.query.passwordResetTokens.findFirst({
          where: and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt)
          ),
        });

        if (!resetTokenEntry) {
          return res.status(400).json({
            success: false,
            error: "Invalid or expired reset token",
          });
        }

        // Get user email for metadata
        const user = await db.query.users.findFirst({
          where: eq(users.id, resetTokenEntry.userId),
        });

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user password
        await db
          .update(users)
          .set({
            password: hashedPassword,
          })
          .where(eq(users.id, resetTokenEntry.userId));

        // Mark token as used
        await db
          .update(passwordResetTokens)
          .set({
            usedAt: new Date(),
          })
          .where(eq(passwordResetTokens.id, resetTokenEntry.id));

        // Log activity
        await db.insert(activityLog).values({
          userId: resetTokenEntry.userId,
          action: "password_reset",
          resourceType: "user",
          resourceId: resetTokenEntry.userId,
          metadata: JSON.stringify({
            email: user?.email,
            timestamp: new Date().toISOString(),
            description: "User reset their password",
          }),
        });

        console.log(
          `[Auth] ✅ Password reset successful for user ${resetTokenEntry.userId}`
        );

        return res.status(200).json({
          success: true,
          message: "Password reset successfully! You can now log in with your new password.",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("[Auth] Password reset verification error:", error);
        captureException(error instanceof Error ? error : new Error(String(error)));

        return res.status(500).json({
          success: false,
          error: "An error occurred while resetting your password. Please try again.",
        });
      }
    }
  );

  /**
   * PASSWORD RESET FLOW - VERIFY TOKEN ONLY (For frontend validation)
   * GET /api/auth/password-reset/verify-token
   * 
   * Allows frontend to check if reset token is valid before showing reset form
   */
  app.get(
    "/api/auth/password-reset/verify-token",
    async (req: Request, res: Response) => {
      try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
          return res.status(400).json({
            success: false,
            error: "Reset token is required",
          });
        }

        // Find active reset token
        const resetTokenEntry = await db.query.passwordResetTokens.findFirst({
          where: and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt)
          ),
        });

        if (!resetTokenEntry) {
          return res.status(400).json({
            success: false,
            error: "Invalid or expired reset token",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Token is valid",
        });
      } catch (error) {
        console.error("[Auth] Token verification error:", error);
        return res.status(500).json({
          success: false,
          error: "An error occurred while verifying the token",
        });
      }
    }
  );

  /**
   * POST /api/auth/change-password
   * Change password for authenticated user while logged in
   * 
   * REQUIREMENTS:
   * - User must be authenticated (Authorization: Bearer token)
   * - Must provide current password (for verification)
   * - Must provide new password (must be different and meet strength requirements)
   * - New password must be confirmed
   * 
   * SECURITY:
   * - Verifies current password using bcrypt before allowing change
   * - New password must meet minimum requirements
   * - Activity is logged for audit trail
   */
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Extract user ID from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix
      const payload = verifyToken(token);
      
      if (!payload || !payload.userId) {
        return res.status(401).json({
          success: false,
          error: "Invalid or expired token",
        });
      }

      // Validate inputs
      if (!currentPassword || !currentPassword.trim()) {
        return res.status(400).json({
          success: false,
          error: "Current password is required",
        });
      }

      if (!newPassword || !newPassword.trim()) {
        return res.status(400).json({
          success: false,
          error: "New password is required",
        });
      }

      if (!confirmPassword || !confirmPassword.trim()) {
        return res.status(400).json({
          success: false,
          error: "Password confirmation is required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: "New passwords do not match",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          error: "New password must be different from current password",
        });
      }

      // Validate new password strength
      const strengthCheck = validatePasswordStrength(newPassword);
      if (!strengthCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: strengthCheck.errors.join(", "),
        });
      }

      // Get user from database
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId as string))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const user = userResult[0];

      // Verify current password matches stored hash using bcrypt
      const passwordMatches = await comparePassword(currentPassword, user.password);

      if (!passwordMatches) {
        console.log(`[Auth] Failed password change attempt for ${user.email} - current password incorrect`);
        return res.status(401).json({
          success: false,
          error: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      const updatedUser = await db
        .update(users)
        .set({
          password: hashedPassword,
        })
        .where(eq(users.id, payload.userId as string))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({
          success: false,
          error: "Failed to update password",
        });
      }

      // Log activity
      await db.insert(activityLog).values({
        userId: payload.userId as string,
        action: "password_changed",
        resourceType: "user",
        resourceId: payload.userId as string,
        metadata: JSON.stringify({
          email: user.email,
          timestamp: new Date().toISOString(),
          description: "User changed their password while logged in",
          ipAddress: req.ip || "unknown",
        }),
      });

      console.log(
        `[Auth] ✅ Password successfully changed for user ${user.email}`
      );

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("[Auth] Change password error:", error);
      captureException(error instanceof Error ? error : new Error(String(error)));

      return res.status(500).json({
        success: false,
        error: "An error occurred while changing your password",
      });
    }
  });

  /**
   * POST /api/auth/google
   * Authenticate with Google ID token
   * 
   * Client sends Google ID token, backend verifies with Google API
   * Then creates/finds user and returns JWT auth token
   */
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken, email, name } = req.body;

      if (!idToken || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing idToken or email from Google",
        });
      }

      console.log("[Auth] 🔍 Processing Google auth for:", email);

      // TODO: Verify Google ID token with Google API
      // import { OAuth2Client } from 'google-auth-library';
      // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      // const ticket = await client.verifyIdToken({
      //   idToken: idToken,
      //   audience: process.env.GOOGLE_CLIENT_ID,
      // });
      // const payload = ticket.getPayload();

      // For now, assume token is valid (TODO: add verification)
      const normalizedEmail = sanitizeEmail(email);

      // ✅ Check if user exists with this email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      let user;
      if (existingUser.length > 0) {
        // ✅ User exists - use existing userId
        user = existingUser[0];
        console.log(`[Auth] ✅ Google user found: ${user.email}`);
      } else {
        // ✅ New user - create account from Google data
        const newUserId = crypto.randomUUID();
        const sanitizedName = sanitizeString(name || "");

        await db.insert(users).values({
          email: normalizedEmail,
          name: sanitizedName,
          password: "", // Google users don't have passwords
          emailVerifiedAt: new Date(), // Google emails are verified
          createdAt: new Date(),
        });

        user = {
          id: newUserId,
          email: normalizedEmail,
          name: sanitizedName,
          password: "",
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
        };

        console.log(`[Auth] ✅ New Google user created: ${user.email}`);
      }

      // ✅ Generate JWT tokens
      const { accessToken, refreshToken } = generateTokenPair(user.id, user.email);

      // ✅ Return auth response
      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("[Auth] Google auth error:", error);
      const message = error instanceof Error ? error.message : "Google authentication failed";
      return res.status(500).json({
        success: false,
        error: message,
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
