# Backend API Configuration - Code Walkthrough

## 📍 How TellBill Connects to the Backend

This document shows exactly how the mobile app (React Native) connects to your backend server.

---

## 1. Environment Configuration (.env)

**File:** [.env](.env)

```env
# Backend Server Configuration
EXPO_PUBLIC_BACKEND_IP=10.16.215.139      # Your laptop's IP on the network
EXPO_PUBLIC_BACKEND_URL=http://10.16.215.139:3000  # Full backend URL with port
```

**What this means:**
- `EXPO_PUBLIC_BACKEND_IP` - Your computer's local IP address (10.16.215.139)
- `EXPO_PUBLIC_BACKEND_URL` - Complete URL: `http://10.16.215.139:3000`
- Port `3000` is where your Express backend server runs

---

## 2. Backend URL Resolution Logic

**File:** [client/lib/backendUrl.ts](client/lib/backendUrl.ts)

```typescript
const DEV_PORT = 3000;

/**
 * How the app decides which backend to connect to:
 * 1. Check EXPO_PUBLIC_BACKEND_URL (production URL - highest priority)
 * 2. Check EXPO_PUBLIC_BACKEND_IP (your laptop's IP)
 * 3. Default to localhost (if running on same machine)
 */
export function getBackendUrl(): string {
  // Production URL from environment (highest priority)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    console.log("[Backend] Using production URL from environment");
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Custom IP from environment (for development)
  if (process.env.EXPO_PUBLIC_BACKEND_IP) {
    const url = `http://${process.env.EXPO_PUBLIC_BACKEND_IP}:${DEV_PORT}`;
    console.log("[Backend] Using custom IP from environment:", url);
    return url;
  }

  // Fallback for web app
  const DEFAULT_IP = "localhost";
  const url = `http://${DEFAULT_IP}:${DEV_PORT}`;
  return url;
}
```

**Priority order:**
1. ✅ Production URL from `.env` (if set)
2. ✅ Backend IP from `.env` (if set)
3. ✅ Localhost (fallback)

---

## 3. Using the Backend URL in API Calls

### Example 1: Stripe Payments

**File:** [client/services/stripeService.ts](client/services/stripeService.ts)

```typescript
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";

export const stripeService = {
  initiateCheckout: async (plan: "solo" | "professional" | "enterprise") => {
    const token = await AsyncStorage.getItem("auth_token");
    
    // Makes API call to: http://10.16.215.139:3000/api/payments/stripe/checkout
    const response = await axios.post<CheckoutResponse>(
      `${API_URL}/api/payments/stripe/checkout`,
      { plan },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  },
};
```

**What happens:**
1. App reads `API_URL` from `.env` → `http://10.16.215.139:3000`
2. App makes POST request to `${API_URL}/api/payments/stripe/checkout`
3. Full URL: `http://10.16.215.139:3000/api/payments/stripe/checkout`
4. Backend receives request on your laptop running at `localhost:3000`

---

### Example 2: Transcription Service

**File:** [client/services/transcriptionService.ts](client/services/transcriptionService.ts)

```typescript
// Backend configuration
const DEV_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "10.16.215.139";
const DEV_PORT = 3000;
const PROD_URL = process.env.EXPO_PUBLIC_BACKEND_URL || null;

const getBackendUrl = (): string => {
  // Use production URL if available
  if (PROD_URL) {
    console.log("[Config] Using production:", PROD_URL);
    return PROD_URL;
  }

  // Use development IP
  const devUrl = `http://${DEV_IP}:${DEV_PORT}`;
  console.log("[Config] Using development:", devUrl);
  return devUrl;
};

const BACKEND_URL = getBackendUrl();

// Later in the code:
class TranscriptionService {
  async transcribeAudio(filePath: string) {
    // Makes POST request to: http://10.16.215.139:3000/api/transcribe
    const response = await axios.post(
      `${BACKEND_URL}/api/transcribe`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    return response.data.text; // Transcribed text
  }
}
```

**Flow:**
1. App records voice
2. App sends to `http://10.16.215.139:3000/api/transcribe`
3. Backend processes with Groq/OpenRouter
4. Sends back transcribed text

---

## 🔄 Complete Request Flow

```
┌─────────────────────────────────────────────────────────┐
│ Mobile App (React Native)                               │
│ Running on: Your phone / Expo Go                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Reads from .env:
                   │ EXPO_PUBLIC_BACKEND_URL=http://10.16.215.139:3000
                   │
                   ▼
        ┌──────────────────────┐
        │ Makes HTTP Request    │
        │ to 10.16.215.139:3000 │
        └──────────┬───────────┘
                   │
                   │ Network request via WiFi/USB
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Backend Server (Express.js/Node.js)                     │
│ Running on: Your laptop                                 │
│ Listening on: http://10.16.215.139:3000                 │
│                                                         │
│ Receives request:                                       │
│ POST /api/payments/stripe/checkout                      │
│ POST /api/transcribe                                    │
│ GET /api/invoices                                       │
│ etc.                                                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Processes Request     │
        │ - Validates JWT       │
        │ - Queries Database    │
        │ - Calls Stripe/Groq   │
        └──────────┬───────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Returns Response (JSON)                                 │
│ { success: true, data: {...} }                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Response back over WiFi/USB
                   │
                   ▼
        ┌──────────────────────┐
        │ Mobile App Updates UI │
        │ Shows invoice sent    │
        │ Shows success message │
        └──────────────────────┘
```

---

## 💻 API Endpoints Used

The app calls these backend endpoints:

### Authentication
- `POST /api/auth/signup` - Register account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Payments (Stripe)
- `POST /api/payments/stripe/checkout` - Create checkout session
- `POST /api/payments/stripe/portal` - Open billing portal
- `POST /api/payments/stripe/subscription-status` - Check subscription

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/send` - Send invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Voice/Transcription
- `POST /api/transcribe` - Transcribe audio
- `POST /api/extract-invoice` - Extract invoice from image

### Money Alerts
- `GET /api/money-alerts` - Get alerts
- `POST /api/money-alerts/:id/fix` - Fix alert

---

## 🔧 How to Change the Backend IP

If you host the backend on a different server:

**Option 1: Update .env (Development)**
```env
EXPO_PUBLIC_BACKEND_IP=192.168.1.10    # New laptop IP
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.10:3000
```

**Option 2: Production (AWS/Heroku/etc)**
```env
EXPO_PUBLIC_BACKEND_URL=https://api.tellbill.com
```

**Option 3: In Code (if needed)**
```typescript
// client/services/stripeService.ts
const API_URL = "https://your-production-domain.com"; // Override here
```

---

## 🚀 When You Deploy to Production

**Before:** Development
```
Mobile App → 10.16.215.139:3000 (your laptop)
```

**After:** Production
```
Mobile App → https://api.tellbill.com (AWS/Heroku/VPS)
```

Just update `.env`:
```env
EXPO_PUBLIC_BACKEND_URL=https://api.tellbill.com
```

And rebuild the app. That's it!

---

## 📱 Testing the Connection

**To verify the connection works:**

```bash
# 1. Start backend
npm run start

# 2. Start frontend
npm run client:dev

# 3. Looking at console logs, you'll see:
# [Backend] Using custom IP from environment: http://10.16.215.139:3000
# [Config] Using development backend: http://10.16.215.139:3000

# 4. Try creating an invoice or making a payment
# If it works → Connection is good
# If it fails → Check IP address and firewall
```

---

## 📊 Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **Backend IP** | `.env` | Tells app where backend is located |
| **Backend Port** | `3000` | Fixed port where Express listens |
| **Connection** | WiFi/USB | How phone talks to laptop |
| **API URLs** | Various services | Built from `BACKEND_URL` + endpoint path |
| **Production** | Environment variable | Can switch backend without rebuilding code |

---

**Key Takeaway:**

The app reads `EXPO_PUBLIC_BACKEND_URL` from `.env`, and uses it to construct API URLs. This allows easy switching between development (your laptop) and production (cloud server) without code changes.
