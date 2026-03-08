# TellBill API Integration Guide

## Overview

TellBill's frontend uses a **unified backend URL configuration system** that supports:
- ✅ Local web development (localhost:3000)
- ✅ Mobile development with Expo Go (dev machine IP)
- ✅ Production standalone APK/AAB (hosted HTTPS backend)

All API calls are centralized through `@/lib/backendUrl.ts`, ensuring consistency across the entire app.

---

## Environment Variables

### EXPO_PUBLIC_BACKEND_URL (Production)
Used by **standalone APK/AAB builds** to connect to the hosted backend.

```env
# .env or .env.production
EXPO_PUBLIC_BACKEND_URL=https://tellbill-api.onrender.com
```

- **Must be HTTPS** (required for production)
- **Ignored in Expo Go** (local development)
- Example: `https://your-api.onrender.com`, `https://api.yourapp.com`

### EXPO_PUBLIC_BACKEND_IP (Development)
Used by **Expo Go on mobile devices** to connect to your development machine.

```env
# .env.local
EXPO_PUBLIC_BACKEND_IP=192.168.1.100
```

- Your development machine's local network IP
- **Only used in Expo Go**, not in standalone builds
- Find your IP: Windows `ipconfig`, Mac `ifconfig`, Linux `hostname -I`

### Fallback (Web Development)
Web development automatically uses `http://localhost:3000` if neither variable is set.

---

## Backend URL Resolution (Priority Order)

The `getBackendUrl()` function resolves the backend URL as follows:

```typescript
1. if EXPO_PUBLIC_BACKEND_URL is set
   → Use it (production APK/AAB)
   
2. else if EXPO_PUBLIC_BACKEND_IP is set
   → Use http://{IP}:3000 (Expo Go mobile dev)
   
3. else
   → Use http://localhost:3000 (web dev fallback)
```

---

## Usage in Code

### Centralized API URL Builder
All API calls should use `getApiUrl()` from `@/lib/backendUrl.ts`:

```typescript
import { getApiUrl } from '@/lib/backendUrl';

// Get full API endpoint
const url = getApiUrl('/api/invoices');     // ✅ http://localhost:3000/api/invoices
const url = getApiUrl('api/invoices');      // ✅ http://localhost:3000/api/invoices (slash added)
```

### Fetch API
```typescript
import { getApiUrl, getAuthToken } from '@/lib/backendUrl';

const token = await getAuthToken();
const response = await fetch(getApiUrl('/api/invoices'), {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

### Axios
```typescript
import axios from 'axios';
import { getApiUrl } from '@/lib/backendUrl';

const response = await axios.post(
  getApiUrl('/api/invoices/create'),
  { name: 'Q1 Expenses' },
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### React Query
```typescript
import { getQueryFn } from '@/lib/query-client';

const { data } = useQuery({
  queryKey: ['invoices'],
  queryFn: getQueryFn({ on401: 'throw' }),
});
```

---

## Environment Setup

### For Local Web Development
1. Backend running: `npm run server:dev` (localhost:3000)
2. Frontend: `npx expo start --web`
3. No environment variables needed (uses localhost fallback)

### For Mobile Development with Expo Go

#### Step 1: Find Your Machine IP
**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active WiFi (e.g., 192.168.1.100)
```

**Mac:**
```bash
ifconfig
# Look for "inet" under your WiFi interface (e.g., 192.168.1.100)
```

**Linux:**
```bash
hostname -I
# Use the IP on your local network (not 127.0.0.1)
```

#### Step 2: Create `.env.local`
```env
EXPO_PUBLIC_BACKEND_IP=<YOUR_MACHINE_IP>
# Example: EXPO_PUBLIC_BACKEND_IP=192.168.1.100
```

#### Step 3: Ensure Backend is Accessible
```bash
# Start backend on your dev machine
npm run server:dev

# Backend should be running on http://localhost:3000
# Mobile will connect via http://{YOUR_IP}:3000
```

#### Step 4: Start Expo Go
```bash
npx expo start
# Scan QR code with Expo Go app
```

**Common Issues:**
- ❌ Can't connect: Your mobile device isn't on the same WiFi as your machine
- ❌ Connection refused: Backend isn't running on port 3000
- ❌ Wrong IP: Ensure you're using your local network IP, not a VPN IP

### For Production (Standalone APK/AAB)

#### Step 1: Ensure Backend is Deployed
```
Example: https://tellbill-api.onrender.com
```

#### Step 2: Update `.env.production`
```env
EXPO_PUBLIC_BACKEND_URL=https://tellbill-api.onrender.com
```

#### Step 3: Build APK
```bash
# Using EAS (Recommended)
npx eas build --platform android

# Or local build
npm run android  # Creates debug APK

# Or release build
cd android && ./gradlew assembleRelease
```

#### Step 4: Verify Backend CORS
Ensure your backend allows requests from the APK:

```typescript
// server/index.ts
import cors from 'cors';

app.use(cors({
  origin: ['https://tellbill-api.onrender.com', 'http://localhost:3000'],
  credentials: true,
}));
```

---

## API Endpoint Examples

All endpoints follow the pattern: `{BACKEND_URL}/api/{resource}`

### Invoices
```
GET    /api/invoices                    # List
POST   /api/invoices                    # Create
GET    /api/invoices/:id                # Get single
PUT    /api/invoices/:id                # Update
DELETE /api/invoices/:id                # Delete
```

### Authentication
```
POST   /api/auth/login                  # Login
POST   /api/auth/register               # Register
POST   /api/auth/refresh                # Refresh token
POST   /api/auth/logout                 # Logout
```

### Payments
```
POST   /api/payments/stripe/checkout    # Create checkout
POST   /api/payments/stripe/portal      # Open billing portal
GET    /api/payments/stripe/subscription-status
```

### Money Alerts
```
GET    /api/money-alerts                # List alerts
GET    /api/money-alerts/summary        # Summary stats
GET    /api/money-alerts/:id            # Get alert
POST   /api/money-alerts/:id/fix        # Mark as fixed
POST   /api/money-alerts/:id/resolve    # Resolve
```

---

## Services Using Unified API

All the following services now use the centralized `getApiUrl()`:

### Core Services
- `transcriptionService.ts` - Audio transcription & invoice extraction
- `stripeService.ts` - Payment processing
- `materialCostsService.ts` - Material cost tracking
- `moneyAlertsService.ts` - Financial alerts
- `receiptProcessingService.ts` - Receipt upload & processing

### Query Client
- `lib/query-client.ts` - React Query integration with unified backend

---

## Updating API Calls

When adding new API calls, always use `getApiUrl()`:

### ❌ Wrong (Hardcoded)
```typescript
const response = await fetch('http://localhost:3000/api/invoices');
```

### ✅ Correct (Unified)
```typescript
import { getApiUrl } from '@/lib/backendUrl';

const response = await fetch(getApiUrl('/api/invoices'));
```

---

## Authentication

All API requests should include the JWT token:

```typescript
import { getAuthToken } from '@/lib/query-client';

const token = await getAuthToken();
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
};
```

Token is stored in AsyncStorage and automatically managed by:
- `getAuthToken()` - Retrieve token
- Login flow - Store token on successful login
- Logout flow - Remove token and redirect

---

## WebSocket Connections

If your app uses WebSocket/Socket.io, update connections similarly:

```typescript
import { getBackendUrl } from '@/lib/backendUrl';
import io from 'socket.io-client';

const baseUrl = getBackendUrl();
const socket = io(baseUrl, {
  auth: { token: await getAuthToken() },
});
```

---

## CORS Configuration

Backend CORS must allow requests from all your environments:

```typescript
// server/index.ts
app.use(cors({
  origin: [
    'http://localhost:3000',           // Web dev
    'http://10.0.2.2:3000',            // Android Emulator
    'http://192.168.1.100:3000',       // Dev machine (example IP)
    'https://tellbill-api.onrender.com', // Production
  ],
  credentials: true,
}));
```

---

## Debugging

### Check Current Backend URL
Add this to your app temporarily:

```typescript
import { getBackendUrl } from '@/lib/backendUrl';

console.log('[Debug] Backend URL:', getBackendUrl());
console.log('[Debug] API Version:', getApiUrl('/api/version'));
```

### Common Problems

| Problem | Solution |
|---------|----------|
| Connection refused | Backend not running, check port 3000 |
| Wrong IP | Verify machine IP with `ipconfig` |
| 401 Unauthorized | Token expired or not stored, check AsyncStorage |
| CORS error | Backend CORS doesn't allow your origin |
| Mixed HTTP/HTTPS | Use HTTPS for production, HTTP for dev |
| Wrong environment | Check which .env file is being used |

---

## File Structure

```
lib/
├── backendUrl.ts           # ✅ Unified URL configuration (use this!)
├── query-client.ts         # React Query setup
└── invoiceUtils.ts         # Invoice utilities

client/services/
├── transcriptionService.ts # Uses getApiUrl()
├── stripeService.ts        # Uses getApiUrl()
├── materialCostsService.ts # Uses getApiUrl()
├── moneyAlertsService.ts   # Uses getApiUrl()
└── receiptProcessingService.ts # Uses getApiUrl()

.
├── .env                    # Production backend URL
├── .env.local              # Dev Expo Go IP (local only)
├── .env.production         # Production standalone APK
└── .env.example            # Template
```

---

## Summary

1. **All API calls use `getApiUrl()`** from `@/lib/backendUrl.ts`
2. **Set environment variables** based on your environment:
   - Production: `EXPO_PUBLIC_BACKEND_URL` (.env.production)
   - Dev Mobile: `EXPO_PUBLIC_BACKEND_IP` (.env.local)
   - Dev Web: Fallback to localhost (no config)
3. **Backend URL resolves automatically** based on environment
4. **Configuration is centralized** - no hardcoded URLs in services
5. **All requests include JWT token** from AsyncStorage

---

## References

- [Environment Variables Guide](./docs/ENV_VARIABLES.md)
- [Render Deployment Guide](./PRODUCTION_LAUNCH_SETUP.md)
- [Backend API Documentation](./server/API_DOCS.md)
- [Expo Environment Variables](https://docs.expo.dev/build-reference/variables/)
