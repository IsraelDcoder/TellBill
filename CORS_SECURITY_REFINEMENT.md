# ✅ CORS SECURITY REFINEMENT

## Overview

Production-grade CORS (Cross-Origin Resource Sharing) configuration that:
- ✅ Allows development (localhost/local network)
- ✅ Enforces domain whitelist in production
- ✅ Prevents cross-origin attacks
- ✅ Validates request headers
- ✅ Rate limits preflight requests
- ✅ Logs security violations

---

## CORS Security Threats

### 1. Cross-Site Request Forgery (CSRF)

**Threat:**
```
Attacker website → Makes request to your API
→ Browser sends user's authentication cookies
→ Request succeeds because cookies are sent
```

**Prevention:**
- ✅ CORS limits which domains can make requests
- ✅ Credentials sent only to allowed origins
- ✅ Preflight requests validate OPTIONS method

### 2. Data Exfiltration

**Threat:**
```
Attacker website → Loads your API response in hidden iframe
→ JavaScript reads response data
→ Attacker steals user information
```

**Prevention:**
- ✅ Only allowed origins can read responses
- ✅ Browser enforces Same-Origin Policy
- ✅ Cross-origin requests blocked by default

### 3. Unauthorized API Access

**Threat:**
```
Attacker website → Makes requests to your API
→ If your API doesn't restrict origins, requests succeed
→ Attacker can perform actions as the user
```

**Prevention:**
- ✅ Domain whitelist in production
- ✅ Only requests from allowed origins accepted
- ✅ Development allows only localhost

---

## CORS Configuration

### Environment-Based Configuration

#### Development Mode
```
✅ Localhost allowed (any port)
  - http://localhost:3000
  - http://localhost:8000
  - http://127.0.0.1:3000

✅ Local network IPs allowed (for React Native/Expo)
  - http://192.168.1.100:3000
  - http://10.0.0.5:3000
  - http://172.16.0.1:3000
```

#### Production Mode
```
✅ Only whitelisted domains allowed
  - https://tellbill.com
  - https://app.tellbill.com
  - https://dashboard.tellbill.com
```

### Setting Allowed Domains in Production

Create `.env` file:
```env
NODE_ENV=production
ALLOWED_DOMAINS=tellbill.com,app.tellbill.com,dashboard.tellbill.com
```

Or set environment variable:
```bash
export ALLOWED_DOMAINS="tellbill.com,app.tellbill.com"
```

---

## CORS Flow

### 1. Simple Request Flow (GET, POST with form data)
```
Client Browser → OPTIONS Preflight
↓
Server → CORS headers
↓
Browser → Sends actual request
↓
Server → Response with CORS headers
↓
Browser → Allows JavaScript access
```

### 2. Complex Request Flow (Custom headers, JSON body)
```
Client Browser → OPTIONS Preflight
┌─ Includes:
│  - Origin: https://app.tellbill.com
│  - Access-Control-Request-Method: POST
│  - Access-Control-Request-Headers: Authorization, Content-Type
│
Server → Checks if origin is allowed
├─ If allowed:
│  └─ Responds with 200 + CORS headers
│
├─ If NOT allowed:
│  └─ Responds with 403 (Forbidden)
│
Client Browser → If 200:
│  └─ Sends actual request
│
Client Browser → If 403:
│  └─ Blocks request (doesn't send to server)
```

---

## CORS Headers Explained

### Request Headers (sent by browser)
```
Origin: https://app.tellbill.com
→ Tells server which domain made the request

Access-Control-Request-Method: POST
→ Asks if POST requests are allowed

Access-Control-Request-Headers: Authorization, Content-Type
→ Asks if these headers are allowed
```

### Response Headers (sent by server)
```
Access-Control-Allow-Origin: https://app.tellbill.com
→ Allows this specific origin to access the response

Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
→ Allows these HTTP methods

Access-Control-Allow-Headers: Content-Type, Authorization, ...
→ Allows these request headers

Access-Control-Allow-Credentials: true
→ Allows sending cookies/authentication

Access-Control-Max-Age: 86400
→ Cache preflight response for 24 hours (production)

Access-Control-Expose-Headers: X-RateLimit-Remaining
→ Allows JavaScript to read these response headers
```

---

## Implementation Details

### CORS Middleware Stack
```typescript
setupCorsSecurely(app)
  ├─ corsMiddleware
  │  └─ Validates origin, sets CORS headers
  │
  ├─ validateRequestHeaders
  │  └─ Checks for suspicious headers (XSS, injection)
  │
  ├─ limitPreflightRequests
  │  └─ Rate limits OPTIONS requests (100/min per IP)
  │
  └─ reportCorsViolation
     └─ Logs security violations for monitoring
```

### Origin Validation Logic

```typescript
Development Mode:
  ✅ Localhost:* → Allowed
  ✅ 127.0.0.1:* → Allowed
  ✅ 10.x.x.x:* → Allowed (private network)
  ✅ 172.x.x.x:* → Allowed (private network)
  ✅ 192.x.x.x:* → Allowed (private network)
  ✅ HTTPS localhost:* → Allowed

Production Mode:
  ✅ https://tellbill.com → Allowed (exact match)
  ✅ https://app.tellbill.com → Allowed (subdomain match)
  ❌ http://tellbill.com → Blocked (HTTP not HTTPS)
  ❌ http://localhost:3000 → Blocked (localhost not allowed)
  ❌ https://attacker.com → Blocked (not in whitelist)
```

---

## Security Features

### 1. Header Validation
```typescript
// Checks Authorization header for:
// - javascript: protocols
// - data: URLs
// - <script> tags
// - Event handlers (onclick, onerror, etc.)

// If detected → Returns 400 Bad Request
// → Blocks XSS attempts via headers
```

### 2. Preflight Request Rate Limiting
```typescript
// Limits: 100 preflight (OPTIONS) requests per minute per IP

// Prevents:
// - CORS preflight flooding attacks
// - DoS attacks using preflight requests
// - Excessive OPTIONS request spam

// If exceeded → Returns 429 Too Many Requests
```

### 3. Security Violation Reporting
```typescript
// Logs all rejected CORS requests with:
// - Timestamp
// - Client IP address
// - Requested origin
// - Request method and path
// - User agent

// Sends to error tracking (Sentry) if available
```

### 4. Exposed Headers
```typescript
// Allows JavaScript to read these response headers:
// - X-RateLimit-Limit
// - X-RateLimit-Remaining
// - X-RateLimit-Reset
// - Content-Length
// - X-Content-Type-Options

// Browser prevents reading other headers (security)
```

---

## Configuration Examples

### Example 1: Development Setup
```env
NODE_ENV=development
```

**Result:**
```
✅ http://localhost:3000 → Allowed
✅ http://127.0.0.1:8080 → Allowed
✅ http://192.168.1.100:3000 → Allowed
```

### Example 2: Production Setup
```env
NODE_ENV=production
ALLOWED_DOMAINS=tellbill.com,app.tellbill.com,dashboard.tellbill.com
```

**Result:**
```
✅ https://tellbill.com → Allowed
✅ https://app.tellbill.com → Allowed
✅ https://dashboard.tellbill.com → Allowed
✅ https://www.tellbill.com → Allowed (subdomain match)
❌ http://tellbill.com → Blocked
❌ http://localhost:3000 → Blocked
```

### Example 3: Multiple Production Domains
```env
NODE_ENV=production
ALLOWED_DOMAINS=tellbill.com,api.tellbill.com,example.com,dev.example.com
```

**Result:**
```
✅ https://tellbill.com
✅ https://app.tellbill.com (subdomain of tellbill.com)
✅ https://example.com
✅ https://dev.example.com
✅ https://staging.example.com (subdomain match)
```

---

## CORS Flow Diagrams

### Allowed Request (Development)
```
Browser (http://localhost:3000)
  ↓
OPTIONS /api/auth/login
+ Origin: http://localhost:3000
  ↓
Server: Is origin allowed in development?
  → YES (localhost in development)
  ↓
Response 200
+ Access-Control-Allow-Origin: http://localhost:3000
+ Access-Control-Allow-Methods: GET, POST, ...
+ Access-Control-Allow-Headers: Content-Type, Authorization
  ↓
Browser: Can proceed with actual request
  ↓
POST /api/auth/login
+ Authorization: Bearer token
+ Content-Type: application/json
  ↓
Response 200 (success)
```

### Blocked Request (Production)
```
Browser (https://attacker.com)
  ↓
OPTIONS /api/auth/login
+ Origin: https://attacker.com
  ↓
Server: Is origin allowed in production?
  → NO (not in whitelist)
  ↓
Response 403 (Forbidden)
(No CORS headers sent)
  ↓
Browser: Blocks request
  ↓
JavaScript error: "CORS request failed"
  ↓
Actual POST request is NEVER sent to server
```

---

## Testing CORS Configuration

### Test 1: Check Allowed Origins (Development)
```bash
# Test localhost
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:3000/api/auth/login \
  -v

# Should show:
# < HTTP/1.1 200 OK
# < Access-Control-Allow-Origin: http://localhost:3000
```

### Test 2: Check Blocked Origins (Production)
```bash
# Test attacker domain
curl -H "Origin: https://attacker.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://api.tellbill.com/api/auth/login \
  -v

# Should show:
# < HTTP/1.1 403 Forbidden
# (No Access-Control-Allow-Origin header)
```

### Test 3: Check Production Whitelist
```bash
# Test allowed domain
curl -H "Origin: https://app.tellbill.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://api.tellbill.com/api/auth/login \
  -v

# Should show:
# < HTTP/1.1 200 OK
# < Access-Control-Allow-Origin: https://app.tellbill.com
```

### Test 4: Check Preflight Rate Limiting
```bash
# Send 150 preflight requests in quick succession
for i in {1..150}; do
  curl -X OPTIONS http://localhost:3000/api/test \
    -H "Origin: http://localhost:3000"
done

# Requests after 100 should return 429 Too Many Requests
```

---

## Debugging CORS Issues

### Problem: "No 'Access-Control-Allow-Origin' header"
```
Error: Access to XMLHttpRequest at 'https://api.example.com/api/test'
from origin 'https://app.example.com' has been blocked by CORS policy

Solutions:
1. Check NODE_ENV is not 'production' (or domain is whitelisted)
2. Verify ALLOWED_DOMAINS environment variable is set
3. Check origin exactly matches whitelist
4. Ensure HTTPS is used in production (not HTTP)
5. Check server logs: [CORS] ❌ Rejected: ...
```

### Problem: "Preflight request failed"
```
Error: OPTIONS 403 (Forbidden)

Solutions:
1. Check if origin is in whitelist (production)
2. Check if origin is localhost (development)
3. Check rate limiting (100 preflights per minute)
4. Wait a minute and retry (rate limit reset)
5. Check logs: [Security] Excessive CORS preflight requests
```

### Problem: "Credentials not sent"
```
Error: Cookies/auth not included in cross-origin request

Solutions:
1. Ensure credentials: 'include' in fetch():
   fetch(url, { credentials: 'include' })
2. Ensure Access-Control-Allow-Credentials: true
3. Ensure Access-Control-Allow-Origin is set (not *)
4. Ensure domain exactly matches (not subdomain match)
```

---

## Security Checklist

### ✅ Development Setup
- [x] Localhost allowed (any port)
- [x] Local network IPs allowed (for testing)
- [x] HTTPS localhost allowed
- [x] Methods configured (GET, POST, PUT, DELETE, PATCH)
- [x] Headers configured (Content-Type, Authorization)

### ✅ Production Setup
- [x] NODE_ENV=production
- [x] ALLOWED_DOMAINS set explicitly
- [x] HTTPS required (not HTTP)
- [x] Domains are exact matches or subdomains
- [x] No wildcards (*) in origin
- [x] Credentials setting appropriate

### ✅ Security Features
- [x] Request headers validated
- [x] Preflight requests rate limited
- [x] CORS violations logged
- [x] Sentry integration active
- [x] Suspicious patterns detected

---

## Files Created/Modified

### Created:
- ✅ [server/utils/cors.ts](server/utils/cors.ts) - CORS security module (300+ lines)

### Modified:
- ✅ [server/index.ts](server/index.ts) - Integrated new CORS module

---

## CORS Best Practices

### ✅ DO:
1. Use HTTPS in production
2. Explicitly whitelist domains
3. Validate request origins
4. Rate limit preflight requests
5. Log security violations
6. Monitor CORS rejections
7. Keep whitelist minimal
8. Use exact domain matches when possible

### ❌ DON'T:
1. Use wildcard (*) for origin in production
2. Allow any origin without validation
3. Trust client-side origin setting
4. Disable CORS for convenience
5. Log sensitive data in CORS violations
6. Allow HTTP in production
7. Whitelist too many domains
8. Forget to set credentials correctly

---

## Summary

✅ **CORS Security is 100% Operational**

- ✅ Development mode allows localhost + local network
- ✅ Production mode enforces domain whitelist
- ✅ Request headers validated for XSS/injection
- ✅ Preflight requests rate limited (100/min)
- ✅ Security violations logged and reported
- ✅ Sentry integration for monitoring
- ✅ Configurable via environment variables
- ✅ Production-ready with best practices

**App is now protected against cross-origin attacks!**
