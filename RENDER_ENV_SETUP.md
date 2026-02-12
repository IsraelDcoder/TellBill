# 🚀 Render Environment Variables Setup Guide

> **CRITICAL**: Render does NOT use `.env` files. You must set environment variables in the **Render Dashboard**.

## Why This Matters

Your app is getting "Transcription service not configured" and "Stripe checkout failed" errors because environment variables aren't set in Render. The `.env` file is **only for local development**.

---

## Step 1: Access Render Dashboard

1. Go to https://render.com
2. Click on your **TellBill API** service
3. Go to **Settings** → **Environment**

---

## Step 2: Add These Environment Variables to Render

Copy-paste each variable name and value into Render:

### ✅ Already Configured Variables (Verify These Exist)
```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.uwlxzwvggvqqsbgukjsz:Thisismytellbill@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
EXPO_PUBLIC_BACKEND_URL=https://tellbill-api.onrender.com
JWT_SECRET=dkWIzVVz9q3D7yiXkohBZi6RhjLNhjMFGiZDlnUwzSoWCmhz78Qcf7wVHN0ozimen2wxxEF4StpMjATCnnYg2g==
JWT_REFRESH_SECRET=RR2z9qfJOypBgsT5HiM0gYV4kIs3UINcA5mhqXEgwF+ZV7Ta545X5NkrcBhKTEEzXCzQ/YBGPbCUJ/TJda7itA==
```

### 🔧 Fix These - Missing or Placeholder Values

#### **1. Audio Transcription** ⚠️ BROKEN NOW
```
GROQ_API_KEY=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
```
- Get your own key: https://console.groq.com/
- Free tier available (25k tokens/min)

#### **2. Stripe Price IDs** ⚠️ BROKEN NOW
These are currently `price_xxxxx` (placeholders):

```
STRIPE_SECRET_KEY=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
STRIPE_PUBLISHABLE_KEY=pk_live_... (from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_tlxuVh1qQdDaYjqvcK5nfVxZHFrIf5rN

STRIPE_SOLO_PRICE_ID=price_xxxxx        ← GET THIS FROM STRIPE
STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxx ← GET THIS FROM STRIPE
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx   ← GET THIS FROM STRIPE
```

**How to get Stripe Price IDs:**
1. Go to https://dashboard.stripe.com/products
2. Create 3 products: "Solo", "Professional", "Enterprise"
3. For each, create a **recurring > monthly** price
4. Copy the Price ID (starts with `price_`)
5. Paste into Render

#### **3. Email Service** (Optional but needed for invoice sending)
```
RESEND_API_KEY=re_6VHnDEyH_4Dy9UUD4BNbAGehr7N2BPywn
RESEND_FROM_EMAIL=noreply@tellbill.app
```

---

## Step 3: After Adding Variables to Render

1. **Click Deploy** in Render dashboard
2. Wait for rebuild to complete (you'll see logs)
3. Check the new logs for this output:
   ```
   [Server] ✅ Environment Variables Status:
     GROQ_API_KEY: ✅ SET
     STRIPE_SOLO_PRICE_ID: price_1Ab2Cd3Ef...
     STRIPE_PROFESSIONAL_PRICE_ID: price_2Xy3Zab4Cd...
   ```

---

## Step 4: Test in App

1. **Transcription**: Record a voice note - should transcribe
2. **Stripe**: Click "Upgrade Plan" - should open checkout (not error)

---

## Common Issues

### ❌ Still Getting "Transcription service not configured"
- Verify GROQ_API_KEY is set in Render (not just .env)
- Delete `.env` from production if accidentally deployed
- Restart service in Render dashboard

### ❌ Still Getting Stripe 500 error  
- Verify all 3 STRIPE_*_PRICE_ID are real Stripe price IDs (not `price_xxxxx`)
- Run test: `curl -X POST https://tellbill-api.onrender.com/api/payments/stripe/checkout`

---

## 🔐 Security Note

Never commit actual API keys to git. The current approach is:
- **Local**: Use real keys in `.env` for testing
- **Production (Render)**: Use Render dashboard environment variables (not git)

✅ This is the correct pattern!

---

## Need Help?

Check Render service logs: **TellBill API** → **Logs** → Filter by `[Server]` or `[Transcription]` or `[Stripe]`
