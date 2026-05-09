# Render Environment Variables Setup Guide

This guide explains how to configure the environment variables needed for TellBill to fully function on Render.

## Overview

TellBill requires the following environment variables to activate key features:
- **Supabase** - Already configured ✅ (handles authentication including Google OAuth)
- **RevenueCat** - Subscription management and in-app purchases
- **OpenRouter** - AI-powered features (transcription, scope drift detection)

Without RevenueCat and OpenRouter variables, the app will start but those features will be disabled.

## Step-by-Step Setup

### 1. Access Render Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Sign in with your account
3. Select the **TellBill** project from your services list
4. Click on the service name to open project details

### 2. Navigate to Environment Variables

1. In the left sidebar, click **Environment**
2. You'll see the "Environment Variables" section with existing variables

### 3. Add Supabase Variables (Already Configured ✅)

Your Supabase environment variables are already set up on Render:

| Variable | Status |
|----------|--------|
| `SUPABASE_URL` | ✅ Already configured |
| `SUPABASE_ANON_KEY` | ✅ Already configured |
| `SUPABASE_SERVICE_KEY` | ✅ Already configured |

**Google OAuth Configuration**: Google login is configured in **Supabase Dashboard** (not in Render environment variables). When users tap "Sign in with Google", Supabase handles the OAuth exchange automatically.

### 4. Add RevenueCat Variables

#### Get Credentials from RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Sign in with your account
3. Go to **Project Settings** → **API Keys**
4. You'll see two keys:
   - **Secret Key** (for server-to-server)
   - **Public Key** (for client requests)
5. Copy both values

#### Add to Render

Click **Add Environment Variable** and add:

| Key | Value |
|-----|-------|
| `REVENUECAT_SECRET_KEY` | Paste your Secret Key from RevenueCat |
| `REVENUECAT_PUBLIC_KEY` | Paste your Public Key from RevenueCat |

### 5. Add OpenRouter Variables

#### Get Credentials from OpenRouter

1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign in or create an account
3. Go to your **Account** → **API Keys**
4. Create a new API key or copy existing one
5. Copy the API key value

#### Add to Render

Click **Add Environment Variable** and add:

| Key | Value |
|-----|-------|
| `OPENROUTER_API_KEY` | Paste your API key from OpenRouter |

### 6. Save and Deploy

1. After adding all environment variables, click the **Save Changes** button
2. Render will automatically redeploy the service with the new variables
3. You can monitor the deployment in the **Logs** section
4. Once deployment completes (green checkmark), the features will be active

## Verification

### How to Verify Setup

1. **Supabase/Google OAuth**: Try logging in with a Google account on the app (no configuration needed)
2. **RevenueCat**: Check subscription plans and in-app purchase options
3. **OpenRouter**: Try the transcription or AI features

### Check Logs for Issues

If features aren't working:

1. Go to **Logs** section in Render
2. Look for any error messages related to the missing keys
3. Common errors:
   - `REVENUECAT_SECRET_KEY is not defined` → RevenueCat variable missing
   - `OPENROUTER_API_KEY is not defined` → OpenRouter variable missing
   - For auth issues → Check Supabase Dashboard → Authentication → Logs

## Important Notes

### Security Best Practices

- ✅ Never commit API keys or secrets to Git
- ✅ Use Render's environment variable system (as you're doing)
- ✅ Rotate API keys periodically
- ✅ Use different keys for development, staging, and production

### Feature Status Without Variables

| Feature | Without Variable | With Variable |
|---------|-----------------|---------------|
| Email/Password Login | ✅ Works | ✅ Works |
| Google OAuth | ❌ Disabled | ✅ Works |
| Subscriptions | ❌ Disabled | ✅ Works |
| AI Features | ❌ Disabled | ✅ Works |
| Invoice Management | ✅ Works | ✅ Works |
| Receipt Scanning | ✅ Works | ✅ Works |

### Database Schema Notes

The latest deployment includes removal of deprecated Stripe columns:
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `payment_link_url`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`

These have been replaced by RevenueCat subscription fields (`subscriptionStatus`, `subscriptionTier`, `subscriptionExpiryDate`, `revenuecatAppUserId`).

## Subscription Pricing

TellBill offers three subscription tiers via RevenueCat:

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 voice recordings, 3 invoices lifetime |
| **Solo** | $29/month | Unlimited voice-to-invoice, projects, receipt scanning |
| **Professional** | $34.99/month | Everything in Solo + scope proofs, client approvals, advanced money alerts, dispute-ready work logs |

---

## Troubleshooting

### Variables Not Taking Effect

1. Check that deployment completed successfully
2. Wait 2-3 minutes after deployment for all containers to restart
3. Clear browser cache and reload the app
4. Check that variable names match exactly (case-sensitive)

### Missing Credentials

- **Google**: Visit [Google Cloud Console](https://console.cloud.google.com)
- **RevenueCat**: Visit [RevenueCat Dashboard](https://app.revenuecat.com)
- **OpenRouter**: Visit [OpenRouter.ai](https://openrouter.ai)

### Getting More Help

1. Check Render logs for specific error messages
2. Verify credentials in original services (Google Cloud, RevenueCat, OpenRouter)
3. Ensure credentials haven't been revoked or expired
4. Confirm spelling and exact format of variable names

---

**Last Updated**: March 6, 2025
**Backend Status**: ✅ Running on Render
**Database**: ✅ PostgreSQL with updated schema
