# TellBill Production Configuration Guide

## 🚀 Critical Environment Variables Setup

This guide explains how to obtain and configure the **three critical production credentials** for TellBill.

---

## 1. 🔐 Google OAuth Setup (Required for User Sign-In)

**Status:** ⚠️ **CRITICAL** - Without this, Google sign-in won't work

### Why This Matters
- Enables users to sign in with their Google account
- **NEW SECURITY:** Backend now verifies tokens with Google API (prevents account takeover)
- Required before mobile app launch

### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable **Google+ API**:
   - Search for "Google+ API" in the search bar
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     ```
     https://api.tellbill.app/api/auth/google/callback
     https://localhost:3000/api/auth/google/callback (dev)
     ```
   - Copy the **Client ID** and **Client Secret**

5. For mobile app (if using web OAuth flow):
   - Create additional OAuth credentials for each platform
   - Web: Already done above
   - Android: Add your app's SHA-1 fingerprint
   - iOS: Add your bundle identifier from Xcode

### Add to Render Environment

In Render Dashboard → Your WebService → Environment:
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_FROM_GOOGLE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_GOOGLE
GOOGLE_REDIRECT_URI=https://api.tellbill.app/api/auth/google/callback
```

### Test OAuth Flow
```bash
# This should NOT error about invalid token:
curl -X POST https://api.tellbill.app/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test_token_from_google"}'

# Should respond: "Google token verification failed"
# (Because "test_token_from_google" is invalid, but verification happened)
```

---

## 2. 💰 RevenueCat Setup (Required for In-App Payments)

**Status:** ⚠️ **CRITICAL** - Without this, paid subscriptions won't work

### Why This Matters
- Manages subscriptions for iOS and Android
- Handles payment processing through App Store and Google Play
- Provides webhook notifications when users subscribe/cancel
- Handles subscription renewal and billing issues

### Get RevenueCat Credentials

1. Go to [RevenueCat Dashboard](https://dashboard.revenuecat.com)

2. Sign up or log in

3. Create a new project named "TellBill"

4. Get your API keys:
   - go to **Settings** → **API keys**
   - Copy **Secret API Key** (starts with `secret_...`)
   - Copy **Public API Key** (starts with `appl_...`)

5. **Connect Google Play Store**:
   - In RevenueCat → Settings → Google Play
   - Create a Service Account in Google Play Console:
     - Go to [Google Play Console](https://play.google.com/console)
     - Settings → API access → Create Service Account
     - Download JSON private key
     - Upload to RevenueCat

6. **Configure Products** in RevenueCat:
   - Create products matching TellBill plans:
     - `solo_monthly` - $9.99/month
     - `solo_annual` - $99.99/year
     - `professional_monthly` - $29.99/month
     - `professional_annual` - $299.99/year

7. **Create Entitlements**:
   - `pro` - Grants professional features
   - `solo` - Grants solo features

### Add to Render Environment

In Render Dashboard → Your WebService → Environment:
```
REVENUECAT_SECRET_KEY=secret_xxxxxxxxxxxxx
REVENUECAT_PUBLIC_KEY=appl_xxxxxxxxxxxxx
```

### Add Webhook in RevenueCat

1. In RevenueCat → Project Settings → Integrations → Webhooks
2. Add webhook URL: `https://api.tellbill.app/api/webhooks/revenuecat`
3. RevenueCat will send purchase/cancellation events to this endpoint
4. The app automatically updates subscription status when webhooks arrive

### Webhook Events Handled
- `initial_purchase` → User subscribed
- `renewal` → Subscription renewed
- `expiration` → Subscription expired
- `cancellation` → User cancelled subscription
- `billing_issue` → Payment failed

---

## 3. 🔴 Sentry Setup (Recommended for Error Tracking)

**Status:** 🟡 **RECOMMENDED** - Optional but highly recommended for production

### Why This Matters
- Captures all server-side errors in real-time
- Provides error aggregation and alerting
- Helps identify production issues before users report them
- Tracks error frequency and affected users

### Get Sentry Credentials

1. Go to [Sentry.io](https://sentry.io)

2. Sign up or log in

3. Create a new project:
   - Platform: **Node.js**
   - Alert Rule: **Alert me immediately**

4. Get your DSN:
   - DSN is shown on the setup page
   - Format: `https://<key>@<slug>.ingest.sentry.io/<project-id>`

### Add to Render Environment

In Render Dashboard → Your WebService → Environment:
```
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_ENVIRONMENT=production
```

### Configure Error Filtering

Sentry already filters:
- Sensitive data (passwords, tokens, credit cards)
- Browser extensions
- Network timeouts

### Test Sentry Integration

```bash
# This will trigger a test error on server startup:
# Check Sentry dashboard - error should appear within 30 seconds
```

---

## ✅ Complete Setup Checklist

### Before Launch
- [ ] Google OAuth credentials obtained and added to Render
- [ ] RevenueCat account created and products configured
- [ ] Google Play Service Account JSON key uploaded to RevenueCat
- [ ] RevenueCat webhook URL added (`https://api.tellbill.app/api/webhooks/revenuecat`)
- [ ] Sentry DSN created and added to Render (optional but recommended)
- [ ] All environment variables pushed to Render

### Verification Steps
1. **Google OAuth**: Rebuild Expo app and test sign-in on device
2. **RevenueCat**: Purchase a subscription in-app, verify in RevenueCat dashboard
3. **Sentry**: Check Sentry dashboard for errors/events from production

### What's Included Now
- ✅ Google OAuth token verification (prevents token forgery)
- ✅ RevenueCat subscription management
- ✅ Sentry error tracking with sensitive data filtering
- ✅ Webhook handling for subscription events
- ✅ Environment validation on server startup

---

## 🚨 Render Deployment Steps

After configuring all environment variables:

1. Go to Render Dashboard → Your TellBill Web Service
2. Go to **Environment** tab
3. Add ALL `***SET_IN_RENDER_ENVIRONMENT***` variables from `.env.production`
4. Save changes
5. Service will auto-redeploy with new configuration
6. Check logs: Should see all variables marked as ✅ SET

---

## 🔍 Troubleshooting

### Google OAuth not working
```
[Auth] ❌ Google token verification failed
```
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check if OAuth redirect URL matches in Google Cloud Console

### RevenueCat webhook not received
```
[RevenueCat Webhook] Error: User not found for appUserId
```
- Ensure Expo app is built with correct `REVENUECAT_PUBLIC_KEY`
- Verify webhook URL is publicly accessible: `https://api.tellbill.app/api/webhooks/revenuecat`

### Sentry not capturing errors
```
[Sentry] SENTRY_DSN not configured. Error tracking disabled.
```
- Add valid DSN to Render environment
- Redeploy service to pick up new DSN

---

## 📚 Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [Sentry Error Tracking](https://docs.sentry.io/platforms/node/)

---

## 🎯 Next Steps

1. ✅ Obtain all three sets of credentials (Google, RevenueCat, Sentry)
2. ✅ Add to Render environment variables
3. ✅ Rebuild mobile app with correct backend URL
4. ✅ Test Google sign-in on real device
5. ✅ Test in-app subscription purchase
6. ✅ Monitor errors in Sentry

**Timeline: 1-2 hours to complete all setup**
