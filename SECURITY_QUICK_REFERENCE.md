# 🛡️ SECURITY QUICK REFERENCE FOR DEVELOPERS

## When Adding New Endpoints

### Checklist
1. **Authentication Required?**
   - [ ] Add `authMiddleware` to route
   - [ ] Check user has permission
   - [ ] Verify subscription level if needed

2. **Input Validation?**
   - [ ] Import validation functions from `server/utils/validation.ts`
   - [ ] Validate email, phone, amounts, etc.
   - [ ] Return 400 if invalid
   - [ ] Handle validation errors gracefully

3. **Sanitization?**
   - [ ] Use `sanitizeString()` for user text input
   - [ ] Use `sanitizeEmail()` for emails
   - [ ] Use `sanitizePhoneNumber()` for phone numbers
   - [ ] Use `sanitizeObject()` for nested data

4. **Rate Limiting?**
   - [ ] Add rate limiter if sensitive endpoint
   - [ ] Import from `server/utils/rateLimiter.ts`
   - [ ] Use existing limiter or create new one
   - [ ] Test with rapid requests

5. **Error Handling?**
   - [ ] Catch errors and return appropriate status
   - [ ] Log errors to Sentry (automatic with middleware)
   - [ ] Don't expose sensitive details in error messages
   - [ ] Return 500 for server errors

### Code Template
```typescript
import { validateEmail, sanitizeString } from "./utils/validation";
import { loginLimiter } from "./utils/rateLimiter";
import { Sentry } from "./utils/sentry";

// Route definition
app.post("/api/myendpoint", authMiddleware, loginLimiter, async (req, res) => {
  try {
    // 1. Input validation
    const { email, name } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    // 2. Sanitization
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName) {
      return res.status(400).json({ error: "Invalid name" });
    }

    // 3. Business logic
    const result = await db.query(/* ... */);

    // 4. Response
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    // 5. Error handling
    console.error("Error:", error);
    // Sentry captures automatically
    res.status(500).json({ error: "Internal server error" });
  }
});
```

---

## Security Functions Reference

### Authentication
```typescript
import { authMiddleware, createToken, verifyToken } from "./utils/authMiddleware";

// Protect route
app.get("/api/protected", authMiddleware, (req, res) => {
  // req.user is available
});

// Create JWT
const token = createToken({ userId: "123", role: "user" });

// Verify JWT
const payload = verifyToken(token);
```

### Input Validation
```typescript
import {
  validateEmail,
  validatePhoneNumber,
  validateAmount,
  validateUUID,
  validateString,
  validateName
} from "./utils/validation";

validateEmail("user@example.com"); // true/false
validatePhoneNumber("+1234567890"); // true/false
validateAmount("99.99"); // true/false
validateUUID("550e8400-e29b-41d4-a716-446655440000"); // true/false
validateString(name, 1, 100); // true/false (min 1, max 100 chars)
validateName("John Doe"); // true/false (letters, numbers, spaces, hyphens)
```

### Input Sanitization
```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeObject,
  sanitizeUserContent,
  sanitizeAmount,
  sanitizeUrl,
  escapeHtml,
  stripHtmlTags,
  sanitizeCommandInput,
  sanitizeFilePath
} from "./utils/sanitize";

// Strings
sanitizeString("  hello  "); // "hello" (trim, normalize)
sanitizeUserContent("<script>alert(1)</script>"); // Removes dangerous tags

// Formats
sanitizeEmail("test@example.com "); // "test@example.com"
sanitizePhoneNumber("123-456-7890"); // "1234567890"
sanitizeAmount("99.99"); // 99.99 (as number)
sanitizeUrl("https://example.com"); // Validates URL

// Batch operations
const obj = { name: "  John  ", email: "test@example.com " };
sanitizeObject(obj); // { name: "John", email: "test@example.com" }

// Security threats
escapeHtml("<div>"); // "&lt;div&gt;"
stripHtmlTags("<p>text</p>"); // "text"
sanitizeCommandInput("'; DROP TABLE users"); // Removes shell chars
sanitizeFilePath("../../etc/passwd"); // Blocks traversal
```

### Subscription Verification
```typescript
import { subscriptionMiddleware } from "./utils/subscriptionMiddleware";
import { SubscriptionManager } from "./utils/subscriptionManager";

// Protect by subscription level
app.post("/api/premium-feature", authMiddleware, subscriptionMiddleware("pro"), (req, res) => {
  // Only Pro users can access
});

// Check subscription manually
const manager = new SubscriptionManager();
const isPro = await manager.isProUser(userId);
const canCreateMore = await manager.canCreateProject(userId);
```

### Rate Limiting
```typescript
import {
  loginLimiter,
  signupLimiter,
  paymentLimiter,
  webhookLimiter,
  createLimiter
} from "./utils/rateLimiter";

// Use existing
app.post("/api/auth/login", loginLimiter, (req, res) => {
  // 5 attempts per minute
});

// Create custom limiter
const customLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 requests
});

app.post("/api/custom", customLimiter, (req, res) => {
  // Custom rate limit
});
```

### Error Tracking
```typescript
import Sentry from "./utils/sentry";

try {
  // Code
} catch (error) {
  // Automatic if Sentry middleware attached
  Sentry.captureException(error, {
    tags: {
      endpoint: "/api/example",
      userId: req.user.id
    }
  });
}

// Add breadcrumb for context
Sentry.addBreadcrumb({
  level: "info",
  message: "User logged in",
  data: { userId: "123" }
});
```

### CORS Configuration
```typescript
import { setupCorsSecurely } from "./utils/cors";

// Already called in index.ts, but for reference:
setupCorsSecurely(app);

// In .env:
// NODE_ENV=production
// ALLOWED_DOMAINS=example.com,app.example.com
```

---

## Common Security Mistakes

### ❌ DON'T DO THIS

```typescript
// ❌ Trust user input
const projectId = req.query.projectId;
const result = db.query(`SELECT * FROM projects WHERE id = ${projectId}`);

// ✅ DO THIS
const { validateUUID } = require("./utils/validation");
if (!validateUUID(projectId)) return res.status(400).json({ error: "Invalid ID" });
const result = db.query("SELECT * FROM projects WHERE id = ?", [projectId]);
```

```typescript
// ❌ Expose sensitive errors
try {
  // code
} catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}

// ✅ DO THIS
try {
  // code
} catch (error) {
  console.error("Error:", error);
  res.status(500).json({ error: "Internal server error" });
}
```

```typescript
// ❌ Allow any CORS origin
const corsOptions = {
  origin: "*"
};

// ✅ DO THIS (already configured)
// setupCorsSecurely(app) handles this automatically
```

```typescript
// ❌ Store passwords in plain text
const user = await db.create({
  email,
  password: req.body.password
});

// ✅ DO THIS
import bcrypt from "bcrypt";
const hashedPassword = await bcrypt.hash(req.body.password, 10);
const user = await db.create({
  email,
  password: hashedPassword
});
```

```typescript
// ❌ Store authentication in localStorage
localStorage.setItem("token", token);

// ✅ DO THIS (for React Native)
import AsyncStorage from "@react-native-async-storage/async-storage";
await AsyncStorage.setItem("token", token);
```

```typescript
// ❌ Log sensitive data
console.log("User:", { email, password, token });

// ✅ DO THIS
console.log("User logged in:", { userId, email });
```

---

## Testing Security Features

### Test Authentication
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/me

# Expired token (after 7 days)
# Should return 401 Unauthorized
```

### Test Input Validation
```bash
# Invalid email
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"pass123"}'
# Should return 400

# Valid email
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
# Should return 200
```

### Test Rate Limiting
```bash
# Send 10 requests rapidly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
# First 5: 401 (wrong password)
# After 5: 429 (rate limited)
```

### Test Sanitization
```bash
# XSS attempt
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}'

# Retrieve project
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/projects/1

# Should show escaped: "&lt;script&gt;alert(1)&lt;/script&gt;"
# Not executable code
```

### Test CORS
```bash
# Development (should allow)
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3000/api/test
# Should return 200 with CORS headers

# Production (different origin)
curl -H "Origin: https://attacker.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://api.example.com/api/test
# Should return 403
```

---

## Debugging Security Issues

### Enable Debug Logging
```env
# In .env
DEBUG=tellbill:*
LOG_LEVEL=debug
```

### Check JWT Secret
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Should output strong random string, not empty
```

### Verify CORS Configuration
```bash
# Check environment
echo $ALLOWED_DOMAINS
echo $NODE_ENV

# For production, should show domains and "production"
```

### Test Database Connection
```bash
# Verify DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"
# Should return 1 if connection works
```

### Check Backup System
```bash
# List backups
npm run backup:list

# Verify latest backup
npm run backup:verify

# Check backup directory
ls -lah backups/
```

### Monitor Errors
```bash
# Check Sentry dashboard
# https://sentry.io/organizations/[org]/issues/

# Or check server logs
tail -f logs/error.log
```

---

## Resources

### File Locations
- **Auth:** `server/utils/authMiddleware.ts`, `server/utils/jwt.ts`
- **Validation:** `server/utils/validation.ts`
- **Sanitization:** `server/utils/sanitize.ts`
- **Subscriptions:** `server/utils/subscriptionManager.ts`
- **Rate Limiting:** `server/utils/rateLimiter.ts`
- **Error Tracking:** `server/utils/sentry.ts`
- **Backups:** `server/utils/backup.ts`
- **CORS:** `server/utils/cors.ts`

### Documentation
- [INPUT_SANITIZATION.md](INPUT_SANITIZATION.md) - Sanitization guide
- [CORS_SECURITY_REFINEMENT.md](CORS_SECURITY_REFINEMENT.md) - CORS guide
- [PRODUCTION_READY_SUMMARY.md](PRODUCTION_READY_SUMMARY.md) - Full overview

### External Links
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Questions?

1. **How do I add a new endpoint?** → See "Code Template" above
2. **How do I validate user input?** → Use functions from `server/utils/validation.ts`
3. **How do I protect sensitive endpoints?** → Add `authMiddleware` and `subscriptionMiddleware`
4. **How do I test security?** → See "Testing Security Features" section
5. **Is this production ready?** → Yes! ✅ All 10 security tasks complete

**Status: 🚀 PRODUCTION READY**
