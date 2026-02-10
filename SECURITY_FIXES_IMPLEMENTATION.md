# Critical Production Fixes - Implementation Guide

## 🚨 PHASE 1: Security Hardening (Before Production Launch)

### Fix #1: JWT Refresh Token Strategy (2 hours)

**Current Problem:**
```typescript
// server/auth.ts
jwt.sign(payload, JWT_SECRET, { expiresIn: "365d" }) // ⚠️ NEVER expires effectively
```
User logs in once → token valid forever → compromised token = forever access

**Solution:**
Create short-lived access tokens + long-lived refresh tokens in `httpOnly` cookie

**Files to Create:**
1. `server/services/tokenService.ts`
2. Update `server/auth.ts` with new endpoints

**Step-by-Step:**

```typescript
// server/services/tokenService.ts (NEW FILE)
export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" } // ✅ Short-lived
  );

  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" } // 1 week
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired - refresh required");
    }
    throw new Error("Invalid token");
  }
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
};
```

```typescript
// server/auth.ts - Add refresh endpoint
app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
    
    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});
```

```typescript
// server/auth.ts - Login endpoint update
app.post("/api/auth/login", async (req, res) => {
  // ... existing validation ...
  
  const { accessToken, refreshToken } = generateTokens(user.id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken, user });
});
```

**Frontend Update:**
```typescript
// client/services/authService.ts
const response = await axios.post("/api/auth/login", credentials);
const { accessToken } = response.data;

// Store access token in AsyncStorage
await AsyncStorage.setItem("accessToken", accessToken);
// Refresh token stored in httpOnly cookie (automatic)

// Before every API request:
const accessToken = await AsyncStorage.getItem("accessToken");
axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

// On 401 response:
const newToken = await axios.post("/api/auth/refresh");
await AsyncStorage.setItem("accessToken", newToken.data.accessToken);
// Retry original request
```

**Required Environment Variable:**
```env
JWT_REFRESH_SECRET=your-long-random-string-min-32-chars
```

Generate with: `openssl rand -hex 32`

---

### Fix #2: Email Verification on Signup (2 hours)

**Current Problem:**
Anyone can sign up with `fake@example.com` → no consequence → service abuse

**Solution:**
Send verification email → require click before account active

**Install Resend:**
```bash
npm install resend
```

**Files to Create:**
1. `server/services/emailService.ts` (wrap Resend)
2. `server/routes/verificationRoutes.ts` (verify endpoint)

**Step-by-Step:**

```typescript
// server/services/emailService.ts (NEW FILE)
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, token: string) => {
  const verifyUrl = `https://app.tellbill.com/verify?token=${token}`;

  await resend.emails.send({
    from: "no-reply@tellbill.com",
    to: email,
    subject: "Verify your TellBill email",
    html: `
      <h2>Welcome to TellBill!</h2>
      <p>Click the button below to verify your email:</p>
      <a href="${verifyUrl}" style="padding: 10px 20px; background: #007AFF; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>Link expires in 24 hours.</p>
    `,
  });
};
```

```typescript
// server/middlewares/requireVerified.ts (NEW FILE)
export const requireVerified = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  
  if (!user.email_verified_at) {
    return res.status(403).json({
      error: "Email not verified",
      message: "Check your email for verification link",
    });
  }

  next();
};
```

```typescript
// server/auth.ts - Update signup
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;

  // Validation...
  const user = await db.insert(users).values({
    email,
    name,
    password: hashPassword(password),
    email_verified_at: null, // ✅ Not verified initially
  });

  // Generate verification token (valid 24h)
  const verificationToken = jwt.sign(
    { userId: user.id, type: "email-verification" },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  res.json({
    message: "Signup successful. Check your email to verify.",
    requiresVerification: true,
  });
});

// Verify email endpoint
app.get("/api/auth/verify-email", async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token as string, process.env.JWT_SECRET!);
    
    if (decoded.type !== "email-verification") {
      throw new Error("Invalid token type");
    }

    await db
      .update(users)
      .set({ email_verified_at: new Date() })
      .where(eq(users.id, decoded.userId));

    res.json({ message: "Email verified! You can now log in." });
  } catch (err) {
    res.status(400).json({ error: "Invalid or expired verification token" });
  }
});
```

**Database Migration:**
```sql
-- Add to migrations/0015_email_verification.sql
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
```

**Frontend:**
```typescript
// client/screens/SignupScreen.tsx
const [showVerificationSheet, setShowVerificationSheet] = useState(false);

const handleSignup = async (email, password, name) => {
  const response = await signup({ email, password, name });
  
  if (response.requiresVerification) {
    setShowVerificationSheet(true); // Show "Check your email" modal
  } else {
    // Auto-login
    navigateToDashboard();
  }
};
```

**Required Environment Variable:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

### Fix #3: Account Lockout After Failed Login (1 hour)

**Current Problem:**
Attacker can brute force passwords → try 1000 combinations per minute → no protection

**Solution:**
Lock account after 5 failed attempts for 30 minutes

**Files to Update:**
1. `server/auth.ts` (update login endpoint)
2. `shared/schema.ts` (add fields to users table)

**Step-by-Step:**

```typescript
// shared/schema.ts - Add to users table
export const users = pgTable("users", {
  // ... existing fields ...
  failed_login_attempts: integer().default(0),
  locked_until: timestamp(),
});
```

```typescript
// server/auth.ts - Update login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid email" });
  }

  // ✅ Check if account locked
  if (user.locked_until && user.locked_until > new Date()) {
    const minutesRemaining = Math.ceil(
      (user.locked_until.getTime() - Date.now()) / 60000
    );
    return res.status(429).json({
      error: `Account locked. Try again in ${minutesRemaining} minutes`,
    });
  }

  // ✅ Verify password
  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    // ✅ Increment failed attempts
    const newAttempts = (user.failed_login_attempts || 0) + 1;

    let lockUntil = null;
    if (newAttempts >= 5) {
      lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
    }

    await db
      .update(users)
      .set({
        failed_login_attempts: newAttempts,
        locked_until: lockUntil,
      })
      .where(eq(users.id, user.id));

    if (lockUntil) {
      return res.status(429).json({
        error: "Account locked after 5 failed attempts. Try again in 30 minutes.",
      });
    }

    return res.status(401).json({
      error: `Invalid password (${5 - newAttempts} attempts remaining)`,
    });
  }

  // ✅ Reset on successful login
  const { accessToken, refreshToken } = generateTokens(user.id);

  await db
    .update(users)
    .set({ failed_login_attempts: 0, locked_until: null })
    .where(eq(users.id, user.id));

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({ accessToken, user });
});
```

**Database Migration:**
```sql
-- migrations/0016_account_lockout.sql
ALTER TABLE users 
  ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN locked_until TIMESTAMP;

CREATE INDEX idx_users_locked_until ON users(locked_until);
```

---

### Fix #4: Password Reset via Email (1.5 hours)

**Endpoints to Add:**

```typescript
// server/auth.ts

// Request password reset
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // ✅ Don't reveal if email exists (security)
    return res.json({ message: "If email exists, reset link sent" });
  }

  // Generate reset token (valid 1 hour)
  const resetToken = jwt.sign(
    { userId: user.id, type: "password-reset" },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  await sendPasswordResetEmail(email, resetToken);

  res.json({ message: "Password reset link sent to your email" });
});

// Reset password with token
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    
    if (decoded.type !== "password-reset") {
      throw new Error("Invalid token type");
    }

    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ password_hash: hashedPassword })
      .where(eq(users.id, decoded.userId));

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    res.status(400).json({ error: "Invalid or expired reset token" });
  }
});
```

---

## 🔒 Fix #5: Enable HTTPS + Security Headers (30 minutes)

**In production (not localhost):**

```typescript
// server/index.ts - Add at top
import helmet from "helmet";

app.use(helmet()); // ✅ Sets all security headers

// Also add:
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
```

**In .env production:**
```env
NODE_ENV=production
HTTPS=true
```

**In docker-compose.prod.yml:**
```yaml
services:
  nginx:
    image: nginx:latest
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - server
```

---

## 📊 Fix #6: Monitoring Setup (1 hour)

**Sentry Configuration:**

```typescript
// server/index.ts - At very top
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

// Attach middleware
app.use(Sentry.Handlers.requestHandler());

// At the end:
app.use(Sentry.Handlers.errorHandler());
```

**Frontend:**
```typescript
// client/App.tsx
import * as Sentry from "sentry-expo";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: globalThis.__DEV__ ? "development" : "production",
  integrations: [new Sentry.Native()],
});
```

---

## 📋 Implementation Checklist

```
PHASE 1: Security (DO FIRST)
- [ ] JWT Refresh Tokens (15m access, 7d refresh)
- [ ] Email Verification on Signup
- [ ] Account Lockout (5 attempts → 30min lock)
- [ ] Password Reset via Email
- [ ] HTTPS + Security Headers
- [ ] Sentry Error Monitoring

PHASE 2: Infrastructure
- [ ] Move backups to S3
- [ ] Set up Supabase PostgreSQL
- [ ] Configure Stripe live keys
- [ ] Set up external uptime monitoring

PHASE 3: Launch
- [ ] Test complete payment flow
- [ ] Load test with 100 concurrent users
- [ ] Create Terms of Service
- [ ] Create Privacy Policy
- [ ] Deploy to production

PHASE 4: Post-Launch
- [ ] Set up APM (New Relic/Datadog)
- [ ] Monitor errors for 2 weeks
- [ ] Gather user feedback
- [ ] Plan Phase 2 features
```

---

## 📅 Timeline

- **Week 1:** Implement all 6 fixes above (16 hours coding)
- **Week 2:** Test on staging environment, fix any issues
- **Week 3:** Deploy to production with monitoring

**Total time to production-ready: 3 weeks**

Or **Fast Track (2 weeks):**
- Skip Password Reset
- Skip Sentry APM
- Use Firebase for backups instead of S3
- Launch with 4/6 security fixes

---

**Questions?** Implement these in order. Each fix is independent and can be tested separately.
