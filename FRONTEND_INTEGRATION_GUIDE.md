# Frontend Integration Guide - JWT Refresh Token Strategy

## Overview

Your backend now returns **two tokens** on login:
- **accessToken**: Short-lived (15 minutes), use for API calls
- **refreshToken**: Long-lived (7 days), use only for getting new access token

This document shows how to implement token refresh on the frontend.

---

## 1. Storage Strategy

Choose **ONE** storage method:

### Option A: Secure (Recommended for Web)
```typescript
// Store in httpOnly cookie (secure, can't access from JavaScript)
// Backend sets this, frontend doesn't need to handle storage

// Cookie format:
Set-Cookie: refreshToken=eyJ...; 
  HttpOnly; 
  Secure; 
  SameSite=Strict; 
  Max-Age=604800;  // 7 days
```

### Option B: Client Storage (for Mobile/Expo)
```typescript
// Store in Secure Storage (AsyncStorage wrapped with encryption)
import * as SecureStore from 'expo-secure-store';

// After login:
const response = await fetch('/api/auth/login', { ... });
const { accessToken, refreshToken } = await response.json();

// Store tokens securely
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

---

## 2. Logout

### Clear Storage
```typescript
import * as SecureStore from 'expo-secure-store';

async function logout() {
  // Delete tokens from storage
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  
  // Optional: Notify backend
  await fetch('/api/auth/logout', { method: 'POST' });
  
  // Redirect to login
  navigation.navigate('Login');
}
```

---

## 3. Making API Requests

### With Auto-Refresh

```typescript
// Create a fetch wrapper that automatically refreshes tokens

async function apiCall(
  url: string,
  options: RequestInit = {}
) {
  // Get current access token
  const accessToken = await SecureStore.getItemAsync('accessToken');
  
  // Add to request header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  let response = await fetch(url, { ...options, headers });

  // ✅ Auto-refresh on 401 (token expired)
  if (response.status === 401) {
    // Try to refresh token
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      // Retry request with new token
      const newHeaders = {
        ...headers,
        'Authorization': `Bearer ${newAccessToken}`,
      };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      // Refresh failed, redirect to login
      await logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
}

async function refreshAccessToken() {
  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.status !== 200) {
      return null;  // Refresh failed
    }

    const { accessToken, accessTokenExpiresIn } = await response.json();
    
    // Update stored token
    await SecureStore.setItemAsync('accessToken', accessToken);
    return accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}
```

---

## 4. Example: React Native Component

```typescript
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export function SendInvoiceScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendInvoice(
    invoiceId: string,
    recipientEmail: string
  ) {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/api/invoices/send', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId,
          method: 'email',
          contact: recipientEmail,
          clientName: 'Client Name',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle email not verified error
        if (errorData.error === 'EMAIL_NOT_VERIFIED') {
          setError('Please verify your email first. Check your inbox!');
          return;
        }
        
        setError(errorData.message || 'Failed to send invoice');
        return;
      }

      const result = await response.json();
      console.log('Invoice sent:', result);
      
      // Show success toast
      alert('Invoice sent successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* Email verification check */}
      <Text>If you see "verify email" error, check your inbox!</Text>
      
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      
      <Button
        title={loading ? 'Sending...' : 'Send Invoice'}
        onPress={() => sendInvoice('invoice-123', 'client@example.com')}
        disabled={loading}
      />
    </View>
  );
}
```

---

## 5. Example: Expo Router Integration

```typescript
// app/(auth)/_layout.tsx - Handle 401 responses

import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

declare global {
  var apiCall: (
    url: string,
    options?: RequestInit
  ) => Promise<Response>;
}

// Set up global API call function
globalThis.apiCall = setupApiClient();

function setupApiClient() {
  const router = useRouter();

  return async function apiCall(url: string, options: RequestInit = {}) {
    let accessToken = await SecureStore.getItemAsync('accessToken');
    
    // Add token to request
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(url, { ...options, headers });

    // Auto-refresh on 401
    if (response.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const { accessToken: newAccessToken } = await refreshResponse.json();
        await SecureStore.setItemAsync('accessToken', newAccessToken);
        
        // Retry original request
        const newHeaders = { ...headers, 'Authorization': `Bearer ${newAccessToken}` };
        response = await fetch(url, { ...options, headers: newHeaders });
      } else {
        // Refresh failed, redirect to login
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        router.push('/login');
      }
    }

    return response;
  };
}
```

---

## 6. Testing Checklist

- [ ] User signs up → receives accessToken + refreshToken
- [ ] accessToken sent in all API requests
- [ ] Calling protected API without token → 401
- [ ] Calling protected API with expired accessToken → auto-refresh → retry succeeds
- [ ] Calling API after 15 minutes → auto-refresh → succeeds
- [ ] Email verification email arrives → user clicks link → email verified
- [ ] Try to send invoice without email verified → 403 EMAIL_NOT_VERIFIED  
- [ ] Verify email → can now send invoices
- [ ] Login with wrong password 5 times → account locked → 429 error
- [ ] Wait 30 minutes → account unlocks → can login

---

## 7. Common Errors & Fixes

### "MISSING_TOKEN"
```
Frontend: Authorization header not included
Fix: Make sure apiCall() adds Bearer token to header
```

### "TOKEN_EXPIRED"  
```
Frontend: accessToken expired, but refresh failed
Fix: Check refreshToken is still valid (< 7 days old)
Fix: Check JWT_REFRESH_SECRET hasn't changed
```

### "EMAIL_NOT_VERIFIED"
```
Frontend: Trying to send invoice without email verified
Fix: Show message to user: "Check your email for verification link"
Fix: Implement "Resend verification email" button
```

### "ACCOUNT_LOCKED"
```
Frontend: User attempted login 5+ times with wrong password
Fix: Show countdown: "Try again in X minutes"
Fix: Suggest "Forgot password?" option
```

---

## 8. Environment Variables

Add to your `.env.local` or equivalent:

```bash
# Backend URL
EXPO_PUBLIC_API_URL=https://api.tellbill.app

# Or for local development:
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## 9. Advanced: Refresh Token Rotation

For extra security, you can issue a **new refresh token** on every refresh:

```typescript
// Backend would need to change refresh endpoint:
app.post('/api/auth/refresh', ...) => {
  // Return BOTH new accessToken AND new refreshToken
  return {
    accessToken: "...",      // 15 min
    refreshToken: "...",     // NEW! 7 days
    accessTokenExpiresIn: 900
  };
});

// Frontend would then update BOTH tokens:
const { accessToken, refreshToken } = await refreshResponse.json();
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

---

## Summary

1. ✅ Store tokens securely (httpOnly cookies or SecureStore)
2. ✅ Send accessToken in `Authorization: Bearer` header
3. ✅ Catch 401 → refresh token → retry request
4. ✅ On refresh failure → clear tokens → redirect to login
5. ✅ Handle 403 EMAIL_NOT_VERIFIED → show message
6. ✅ Handle 429 ACCOUNT_LOCKED → show countdown

---
