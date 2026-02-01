import type { Express, Request, Response } from "express";
import { eq, sql, and } from "drizzle-orm";
import { users, invoices, projects, activityLog } from "@shared/schema";
import { db } from "./db";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "./utils/password";
import { sendWelcomeEmail } from "./emailService";
import { generateToken, verifyToken } from "./utils/jwt";
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

      // ✅ GENERATE JWT TOKEN for authentication
      const token = generateToken(user.id, user.email);

      // Set user context in Sentry for error tracking
      setSentryUserContext(user.id, user.email);

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
        token, // ✅ Include JWT token in response
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
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

  /**
   * POST /api/auth/login
   * Authenticate existing user with email and password
   *
   * REQUIREMENTS:
   * - Email must exist in database (user must have signed up first)
   * - Password must match the stored password hash
   * - Returns the same user ID that was created at signup
   *
   * RESPONSES:
   * - 200 OK: Authentication successful, user is logged in
   * - 401 Unauthorized: Email does not exist OR password does not match
   * - 400 Bad Request: Missing email or password fields
   * - 429 Too Many Requests: Rate limit exceeded
   * - 500 Server Error: Database or system error
   *
   * AUTHENTICATION PRINCIPLES:
   * ✅ Users MUST sign up before login (no auto-creation)
   * ✅ Login fails if email does not exist
   * ✅ Login fails if password does not match
   * ✅ Returns stable user ID from database (same ID as signup)
   * ✅ Never creates new user on login
   * ✅ Generic error message prevents account enumeration
   */
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

      // LOOKUP: Find user by email in database
      // ✅ This checks if user exists
      // ✅ If not found, user must sign up first
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      // STRICT: Fail if user does not exist
      // ✅ This prevents auto-creating users on login
      // ✅ User must sign up first
      if (userResult.length === 0) {
        // Capture authentication failure
        captureAuthError("invalid_credentials", normalizedEmail, req.ip || "unknown");
        
        // Return generic error to prevent account enumeration
        // (attacker cannot tell if email is registered)
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        } as AuthResponse);
      }

      const user = userResult[0];

      // VERIFY: Password matches stored hash using bcrypt
      // ✅ Never compares plaintext passwords
      // ✅ Secure password verification
      const passwordMatches = await comparePassword(password, user.password);

      // STRICT: Fail if password does not match
      // ✅ This prevents login with wrong password
      if (!passwordMatches) {
        // Capture authentication failure
        captureAuthError("invalid_credentials", normalizedEmail, req.ip || "unknown");
        
        // Return generic error (same as missing user)
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        } as AuthResponse);
      }

      // SUCCESS: Return existing user with stable ID
      // ✅ Returns the SAME user ID that was created at signup
      // ✅ User ID is permanent and unique
      // ✅ This is the user's identity for all future operations
      
      // ✅ GENERATE JWT TOKEN for authentication
      const token = generateToken(user.id, user.email);
      
      // Set user context in Sentry for error tracking
      setSentryUserContext(user.id, user.email);
      
      return res.status(200).json({
        success: true,
        token, // ✅ Include JWT token in response
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
}
