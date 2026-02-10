# 🚀 TellBill Production Deployment Checklist

**Timeline: ~3-4 hours for first-time setup**

---

## ✅ PHASE 1: PRE-DEPLOYMENT (30 min)

- [x] Generate JWT Secrets (COMPLETED)
  - JWT_SECRET: `dkWIzVVz9q3D7yiXkohBZi6RhjLNhjMFGiZDlnUwzSoWCmhz78Qcf7wVHN0ozimen2wxxEF4StpMjATCnnYg2g==`
  - JWT_REFRESH_SECRET: `RR2z9qfJOypBgsT5HiM0gYV4kIs3UINcA5mhqXEgwF+ZV7Ta545X5NkrcBhKTEEzXCzQ/YBGPbCUJ/TJda7itA==`

- [ ] Create Render Account
  - Sign up: https://render.com
  - Authorize with GitHub
  - **Time: 5 min**

- [ ] Push code to GitHub
  - All production code already pushed ✅
  - **Time: Already done**

---

## ✅ PHASE 2: BACKEND DEPLOYMENT (45 min)

### Step 2.1: Create Web Service on Render
- [ ] Go to Render Dashboard → "New +" → "Web Service"
- [ ] Select GitHub repository: `IsraelDcoder/TellBill`
- [ ] **Configuration:**
  - Name: `tellbill-api`
  - Root Directory: (leave blank)
  - Environment: `Node`
  - Build Command: `npm run server:build`
  - Start Command: `node server_dist/index.js`
  - Instance Type: `Starter` ($7/month)
  - Region: Choose closest to you
- [ ] Click "Create Web Service"
- **Time: 10 min + 5 min build**

### Step 2.2: Create PostgreSQL Database on Render
- [ ] Go to Render Dashboard → "New +" → "PostgreSQL"
- [ ] **Configuration:**
  - Name: `tellbill-db`
  - Database Name: `tellbill`
  - User: `postgres`
  - Region: Same as web service
  - Starter plan ($15/month)
- [ ] Click "Create Database"
- [ ] Wait for database to be ready (2-3 min)
- [ ] Copy **Internal Database URL**
- **Time: 5 min + 3 min setup**

### Step 2.3: Set Environment Variables in Render
- [ ] In Web Service → "Environment" tab
- [ ] Add these variables:

```env
NODE_ENV=production
PORT=3000

EXPO_PUBLIC_BACKEND_URL=https://tellbill-api.onrender.com
EXPO_PUBLIC_BACKEND_IP=tellbill-api.onrender.com
EXPO_PUBLIC_APP_URL=https://tellbill.app

DATABASE_URL=[PASTE INTERNAL URL FROM STEP 2.2]

JWT_SECRET=dkWIzVVz9q3D7yiXkohBZi6RhjLNhjMFGiZDlnUwzSoWCmhz78Qcf7wVHN0ozimen2wxxEF4StpMjATCnnYg2g==
JWT_REFRESH_SECRET=RR2z9qfJOypBgsT5HiM0gYV4kIs3UINcA5mhqXEgwF+ZV7Ta545X5NkrcBhKTEEzXCzQ/YBGPbCUJ/TJda7itA==

ALLOWED_DOMAINS=tellbill.app,api.tellbill.app,www.tellbill.app,app.tellbill.app

STRIPE_SECRET_KEY=sk_test_51SxST9FGtZ5bJIbUzbmoOJHwJGtooPtmms6iOAo7yMCM154gRKQkDwdhLAaFahZKZA9oinkrvOOAR5R6oF139iU700GcU9HBvN
STRIPE_PUBLISHABLE_KEY=pk_test_51SxST9FGtZ5bJIbUu8zCTBTSKcPJe78g4Mk5L4q3sloMvqMsBZncUrAuJKacIOPZMUJssohfOW2b6yIBvuICH2uu004nzey02v
STRIPE_WEBHOOK_SECRET=whsec_test_[GET_FROM_STRIPE]

RESEND_API_KEY=[GET_FROM_RESEND_DASHBOARD]
RESEND_FROM_EMAIL=noreply@tellbill.app

SENTRY_DSN=[OPTIONAL_GET_FROM_SENTRY]
```

- [ ] Click "Save"
- **Time: 10 min**

### Step 2.4: Monitor Deployment
- [ ] Check "Logs" tab to verify build succeeds
- [ ] Look for: `> npm run server:build` → `Done in XXms`
- [ ] Wait for "Your service is live at: https://tellbill-api.onrender.com"
- **Time: 5-10 min (watch for errors)**

### Step 2.5: Run Database Migrations
- [ ] In Web Service → "Shell" tab
- [ ] Run: `npm run db:push`
- [ ] Verify output shows migrations applied
- [ ] **Expected tables:**
  - `users`
  - `profiles`
  - `invoices`
  - `webhookProcessed`
  - `refreshTokens`
- **Time: 5 min**

### Step 2.6: Test Backend Health
- [ ] Open in browser: `https://tellbill-api.onrender.com/api/health`
- [ ] Should return: `{"status":"ok"}`
- [ ] If failed: Check Render logs for errors
- **Time: 2 min**

---

## ✅ PHASE 3: STRIPE & EMAIL SETUP (20 min)

### Step 3.1: Configure Stripe Webhook
- [ ] Go to Stripe Dashboard → **Developers** → **Webhooks**
- [ ] Click **"Add endpoint"**
- [ ] **Endpoint URL:** `https://tellbill-api.onrender.com/api/webhooks/stripe`
- [ ] **Events to send:**
  - `charge.succeeded`
  - `charge.failed`
  - `charge.refunded`
- [ ] Click **"Add endpoint"**
- [ ] Copy **Signing secret** (starts with `whsec_`)
- [ ] Add to Render Environment: `STRIPE_WEBHOOK_SECRET=[paste_secret]`
- **Time: 10 min**

### Step 3.2: Get Resend API Key
- [ ] Go to https://resend.com/api-keys
- [ ] Create new API key
- [ ] Copy key
- [ ] Add to Render Environment: `RESEND_API_KEY=[paste_key]`
- **Time: 5 min**

### Step 3.3: Verify Email Sending
- [ ] Test signup: Go to frontend → Signup form
- [ ] Use test email you own
- [ ] Check email for verification link
- [ ] Verify it works
- **Time: 5 min**

---

## ✅ PHASE 4: DNS & DOMAIN (15 min)

### Step 4.1: Get Render Backend Domain
- [ ] In Render Web Service → copy the auto-generated URL
- [ ] Example: `https://tellbill-api.onrender.com`

### Step 4.2: Configure Cloudflare DNS
- [ ] Go to **Cloudflare Dashboard** → Select domain `tellbill.app`
- [ ] Go to **DNS** section
- [ ] Add **CNAME record:**
  ```
  Name: api
  Type: CNAME
  Content: tellbill-api.onrender.com
  TTL: Auto
  ```
- [ ] Click **Save**
- [ ] Wait 5-10 minutes for propagation

### Step 4.3: Verify DNS Resolution
- [ ] Open terminal and run: `nslookup api.tellbill.app`
- [ ] Should resolve to Render's servers
- [ ] Or test: `curl https://api.tellbill.app/api/health`
- **Time: 10 min**

---

## ✅ PHASE 5: FRONTEND DEPLOYMENT (30 min)

### Step 5.1: Build Frontend Production
- [ ] In terminal: `cd c:\TellBill`
- [ ] Run: `npm run expo:static:build`
- [ ] Wait for build to complete (~5 min)
- [ ] Verify `dist/` folder created

### Step 5.2: Deploy Frontend to Vercel (Recommended)
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Run: `vercel --prod`
- [ ] Choose "TellBill" project
- [ ] Confirm deployment
- [ ] Get production URL: `https://tellbill.vercel.app` (or custom domain)
- **Time: 15 min**

**OR** Deploy to Render Static Site:
- [ ] Render Dashboard → "New +" → "Static Site"
- [ ] Connect GitHub repo
- [ ] Build Command: `npm run expo:static:build`
- [ ] Publish Directory: `dist`
- [ ] Deploy

### Step 5.3: Update Cloudflare DNS for Frontend
- [ ] If using Vercel: Add Vercel nameservers (Vercel handles this)
- [ ] If using Render: Add CNAME for `tellbill.app`
- [ ] Test: `https://tellbill.app` loads your app

---

## ✅ PHASE 6: END-TO-END TESTING (45 min)

### Test 1: Signup & Email Verification
- [ ] Visit `https://tellbill.app`
- [ ] Click **Signup**
- [ ] Enter email, password, name
- [ ] Click **Sign up**
- [ ] Check email for verification link
- [ ] Click verification link
- [ ] Should redirect to app
- [ ] Email should be marked as verified in database
- **Expected:** ✅ Signup successful, email verified
- **Time: 10 min**

### Test 2: Login & Token Refresh
- [ ] Click **Login**
- [ ] Enter email and password
- [ ] Click **Login**
- [ ] Should show app dashboard
- [ ] Token should be stored locally
- [ ] After 15 minutes: Token should auto-refresh
- **Expected:** ✅ Login works, token refreshes
- **Time: 5 min (+ 15 min wait for refresh)**

### Test 3: Account Lockout
- [ ] Click **Login**
- [ ] Enter email and WRONG password 5 times
- [ ] After 5th attempt: Should see "Account locked for 30 minutes"
- [ ] Try login again: Should still locked
- **Expected:** ✅ Account locked after 5 failed attempts
- **Time: 5 min**

### Test 4: Create Invoice
- [ ] Click **Create Invoice**
- [ ] Fill in invoice details
- [ ] Click **Create**
- [ ] Invoice should appear in list
- [ ] Check Render logs for any errors
- **Expected:** ✅ Invoice created, appears in database
- **Time: 5 min**

### Test 5: Payment Processing
- [ ] Click on invoice → **Pay Now**
- [ ] Redirect to Stripe payment page
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Expiry: `12/25` | CVC: `123`
- [ ] Click **Pay**
- [ ] Should redirect back to app
- [ ] Invoice status should update to **Paid**
- [ ] Check Stripe Dashboard → Webhooks → Recent deliveries
- [ ] Should see successful webhook delivery
- **Expected:** ✅ Payment processes, webhook fires, invoice marked paid
- **Time: 10 min**

### Test 6: Error Handling
- [ ] Try creating invoice with invalid data
- [ ] Try accessing protected route without login
- [ ] Try refreshing with expired token
- [ ] All should return proper error messages
- **Expected:** ✅ Errors handled gracefully
- **Time: 5 min**

---

## ✅ PHASE 7: PRODUCTION HARDENING (20 min)

### Step 7.1: Enable Database Backups
- [ ] In Render PostgreSQL Instance → **Settings**
- [ ] Set backup frequency: **Daily**
- [ ] Retention: **30 days**
- [ ] Save
- **Time: 5 min**

### Step 7.2: Set Up Error Tracking (Optional)
- [ ] Create account at https://sentry.io
- [ ] Create new project for TellBill
- [ ] Copy DSN (looks like `https://key@sentry.io/project`)
- [ ] Add to Render: `SENTRY_DSN=[paste_dsn]`
- [ ] Deploy
- **Time: 10 min**

### Step 7.3: Enable Uptime Monitoring (Optional)
- [ ] Use Pingdom, Uptime Robot, or similar
- [ ] Monitor: `https://api.tellbill.app/api/health`
- [ ] Set alert email if down
- **Time: 5 min**

---

## ✅ PHASE 8: SWITCH TO LIVE STRIPE (When Ready)

**⚠️ Only do this when you're confident everything works!**

### Step 8.1: Get Live Stripe Keys
- [ ] Go to Stripe Dashboard
- [ ] Go to **Settings** → **API Keys**
- [ ] Copy **Live** secret key (starts with `sk_live_`)
- [ ] Copy **Live** publishable key (starts with `pk_live_`)

### Step 8.2: Update Render Environment
- [ ] Render Dashboard → Environment
- [ ] Update `STRIPE_SECRET_KEY=sk_live_...`
- [ ] Update `STRIPE_PUBLISHABLE_KEY=pk_live_...`
- [ ] Re-configure webhook with live endpoint
- [ ] Deploy

### Step 8.3: Test with Real Payment
- [ ] Use real card (test transaction)
- [ ] Verify charge appears in Stripe Dashboard
- [ ] Verify invoice marked as paid

---

## ✅ PHASE 9: LAUNCH & MONITORING (Ongoing)

### Day 1-7 Checklist:
- [ ] Monitor error logs daily
- [ ] Check database size
- [ ] Verify email delivery rate
- [ ] Monitor payment success rate
- [ ] Test all user flows
- [ ] Check Stripe webhook delivery
- [ ] Verify backups running

### Week 2+ Checklist:
- [ ] Optimize database queries if slow
- [ ] Plan for scaling (if needed)
- [ ] Set up CDN for static assets
- [ ] Configure caching headers
- [ ] Review security settings
- [ ] Plan marketing launch
- [ ] Set up analytics

---

## 📊 Summary Status

| Phase | Status | Time | Blockers |
|-------|--------|------|----------|
| 1. Pre-Deployment | ⏳ Ready | 30 min | Need Render account |
| 2. Backend | ⏳ Ready | 45 min | Create Render account |
| 3. Stripe/Email | ⏳ Ready | 20 min | Stripe & Resend accounts |
| 4. DNS | ⏳ Ready | 15 min | Cloudflare access |
| 5. Frontend | ⏳ Ready | 30 min | DNS configured |
| 6. Testing | ⏳ Ready | 45 min | Backend deployed |
| 7. Hardening | ⏳ Ready | 20 min | All working |
| 8. Live Stripe | ⏳ Later | - | When confident |
| 9. Monitoring | ⏳ Later | - | After launch |

---

## 🆘 Quick Troubleshooting

**Backend won't deploy:**
- Check: `npm run server:build` works locally
- Check: All environment variables set
- Check: Render logs for build errors

**Database connection failed:**
- Check: DATABASE_URL format is correct
- Check: Internal URL copied (not external)
- Check: Database is running

**API not responding:**
- Check: `curl https://api.tellbill.app/api/health`
- Check: Render logs for startup errors
- Check: Environmental variables set

**Stripe webhook not firing:**
- Check: Webhook endpoint in Stripe dashboard
- Check: Signing secret in Render env
- Check: Render logs for webhook hits

**DNS not resolving:**
- Check: CNAME record in Cloudflare
- Wait up to 24 hours for TTL
- Clear browser DNS cache

---

## 📞 Support Resources

- **Render Docs:** https://render.com/docs
- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Cloudflare DNS:** https://developers.cloudflare.com/dns
- **Vercel Deploy:** https://vercel.com/docs

**See:** `RENDER_DEPLOYMENT_GUIDE.md` for detailed instructions on each step.
