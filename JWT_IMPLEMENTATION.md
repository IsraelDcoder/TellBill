# JWT Token System Implementation

## Overview
This document outlines the JWT authentication system implementation for TellBill.

## What Was Implemented

### 1. **Backend JWT Utilities** (`server/utils/jwt.ts`)
- ✅ `generateToken()` - Create JWT tokens with user ID and email
- ✅ `verifyToken()` - Validate and decode JWT tokens
- ✅ `decodeToken()` - Safely decode without verification
- ✅ `extractTokenFromHeader()` - Parse Authorization header (Bearer scheme)
- Tokens expire in 7 days by default
- Uses HS256 algorithm with secret key from environment

### 2. **Auth Middleware** (`server/utils/authMiddleware.ts`)
- ✅ `authMiddleware()` - Verify JWT on all protected routes
- ✅ `optionalAuthMiddleware()` - Optional JWT verification
- ✅ `requireAuth()` - Helper function for route handlers
- Extends Express Request interface with `req.user` and `req.token`

### 3. **Backend Updates** (`server/auth.ts`)
- ✅ Import JWT utilities
- ✅ Generate token on signup response
- ✅ Generate token on login response
- ✅ Updated AuthResponse interface to include `token?: string`

### 4. **Client-Side JWT Storage** (`client/context/AuthContext.tsx`)
- ✅ `saveToken()` - Store JWT in AsyncStorage
- ✅ `getStoredToken()` - Retrieve JWT from AsyncStorage
- ✅ `clearToken()` - Remove JWT on logout
- ✅ Updated `signUp()` to save JWT token
- ✅ Updated `signIn()` to save JWT token
- ✅ Updated `signOut()` to clear JWT token
- ✅ Updated `initializeAuth()` to restore session from stored token

### 5. **API Request Enhancement** (`client/lib/query-client.ts`)
- ✅ `getAuthToken()` - Retrieve JWT from AsyncStorage
- ✅ `apiRequest()` - Automatically include JWT in Authorization header
- ✅ All API calls now include: `Authorization: Bearer {token}`

## How It Works

### Sign Up Flow
1. User submits email/password to `/api/auth/signup`
2. Backend creates user and generates JWT token
3. Response includes: `{ success: true, token: "...", user: {...} }`
4. Client saves token to AsyncStorage
5. Token automatically included in future API requests

### Log In Flow
1. User submits email/password to `/api/auth/login`
2. Backend validates credentials and generates JWT token
3. Response includes: `{ success: true, token: "...", user: {...} }`
4. Client saves token to AsyncStorage
5. Token automatically included in future API requests

### App Initialization
1. App starts, checks if JWT exists in AsyncStorage
2. If token found, restores user session automatically
3. Token is included in all API requests (via `apiRequest()`)
4. Backend middleware verifies token before processing requests

### Log Out
1. User clicks logout
2. Client clears token from AsyncStorage
3. Subsequent API requests have no token
4. Backend returns 401 for protected routes

## Environment Variables Required

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# Existing variables
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=...
RESEND_API_KEY=...
FLUTTERWAVE_SECRET_KEY=...
```

## Next Steps (TODO 2)

Add `authMiddleware` to all protected routes in `server/index.ts`:

```typescript
import { authMiddleware } from "./utils/authMiddleware";

// Apply to all protected routes
app.use("/api/invoices", authMiddleware);
app.use("/api/projects", authMiddleware);
app.use("/api/payments", authMiddleware);
// etc...
```

## Security Notes

1. ✅ JWT stored in AsyncStorage (secure for mobile)
2. ✅ Token included in Authorization header (standard HTTP)
3. ⚠️ TODO: Rate limiting on auth endpoints (Task 6)
4. ⚠️ TODO: Backend subscription verification (Task 4)
5. ⚠️ TODO: Input validation on all endpoints (Task 3)
6. ⚠️ TODO: Refresh token rotation for longer sessions

## Testing

```bash
# Install dependencies
npm install

# Signup - should return token
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","name":"Test User"}'

# Login - should return token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Use token in protected routes
curl -X GET http://localhost:3000/api/invoices \
  -H "Authorization: Bearer your_jwt_token_here"
```
