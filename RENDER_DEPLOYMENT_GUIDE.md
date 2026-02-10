# 🚀 TellBill Production Deployment on Render - Step-by-Step Guide

## ✅ Prerequisites Completed
- ✅ Code is production-ready (232.8KB bundle)
- ✅ All TypeScript errors fixed
- ✅ Security features implemented (JWT, email verification, account lockout)
- ✅ Database schema and migrations ready
- ✅ Docker configuration ready

---

## 📋 STEP 1: Generate & Secure Credentials (COMPLETED)

**JWT Secrets Generated:**
```
JWT_SECRET=dkWIzVVz9q3D7yiXkohBZi6RhjLNhjMFGiZDlnUwzSoWCmhz78Qcf7wVHN0ozimen2wxxEF4StpMjATCnnYg2g==
JWT_REFRESH_SECRET=RR2z9qfJOypBgsT5HiM0gYV4kIs3UINcA5mhqXEgwF+ZV7Ta545X5NkrcBhKTEEzXCzQ/YBGPbCUJ/TJda7itA==
```

---

## 🔧 STEP 2: Create Render Account & Setup

### 2.1 Create Account
1. Go to **[render.com](https://render.com)**
2. Click "Get Started"
3. Sign up with GitHub (easiest)
4. Authorize Render to access your GitHub account

### 2.2 Connect GitHub Repository
1. Go to Dashboard
2. Click "New +" → "Web Service"
3. Select your GitHub account
4. Search for "TellBill" repository
5. Click "Connect"

**Configuration:**
- Name: `tellbill-api`
- Root Directory: (leave empty if .git is at root)
- Runtime: `Node`
- Build Command: `npm run server:build`
- Start Command: `node server_dist/index.js`
- Instance Type: "Starter" ($7/month) for now

---

## 🔑 STEP 3: Set Environment Variables on Render

In Render Dashboard → Your Web Service → Environment:

```env
# Core
NODE_ENV=production
PORT=3000

# URLs (Render auto-assigns, but set these)
EXPO_PUBLIC_BACKEND_URL=https://tellbill-api.onrender.com
EXPO_PUBLIC_BACKEND_IP=tellbill-api.onrender.com

# JWT Secrets (FROM STEP 1)
JWT_SECRET=dkWIzVVz9q3D7yiXkohBZi6RhjLNhjMFGiZDlnUwzSoWCmhz78Qcf7wVHN0ozimen2wxxEF4StpMjATCnnYg2g==
JWT_REFRESH_SECRET=RR2z9qfJOypBgsT5HiM0gYV4kIs3UINcA5mhqXEgwF+ZV7Ta545X5NkrcBhKTEEzXCzQ/YBGPbCUJ/TJda7itA==

# Database (From Step 4)
DATABASE_URL=postgresql://[username]:[password]@[internal-host]:5432/tellbill

# CORS
ALLOWED_DOMAINS=tellbill.app,api.tellbill.app,www.tellbill.app,app.tellbill.app

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_[GET_FROM_STRIPE_DASHBOARD]
STRIPE_PUBLISHABLE_KEY=pk_test_[GET_FROM_STRIPE_DASHBOARD]
STRIPE_WEBHOOK_SECRET=(get from Stripe webhook)

# Email
RESEND_API_KEY=(get from Resend dashboard)
RESEND_FROM_EMAIL=noreply@tellbill.app

# Error Tracking (Optional)
SENTRY_DSN=(get from Sentry dashboard)
```

---

## 💾 STEP 4: Create PostgreSQL Database on Render

### 4.1 Create Postgres Instance
1. In Render Dashboard → "New +" → "PostgreSQL"
2. Name: `tellbill-db`
3. Database: `tellbill`
4. User: `postgres`
5. (Region: Choose closest to users)
6. Click "Create Database"

### 4.2 Get Connection String
After creation, copy the **Internal Database URL** (use this, not external):
```
postgresql://postgres:[password]@[internal-hostname]:5432/tellbill
```

Add this to Web Service environment variables as `DATABASE_URL`

---

## 🗄️ STEP 5: Run Database Migrations

Once database is created and `DATABASE_URL` is set:

### Option A: Via Render Shell (Easiest)
1. In your Web Service → "Shell" tab
2. Run: `npm run db:push`
   - This applies all 18 migrations automatically
3. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### Option B: Manually Using psql
```bash
psql [DATABASE_URL] < migrations/0001_initial.sql
psql [DATABASE_URL] < migrations/0017_add_security_fields.sql
psql [DATABASE_URL] < migrations/0018_add_webhook_and_refresh_tokens.sql
# ...and all other migrations
```

**Tables to Verify:**
- `users` (with emailVerifiedAt, failedLoginAttempts, lockedUntil)
- `invoices`
- `profiles`
- `webhookProcessed`
- `refreshTokens`

---

## 🌐 STEP 6: Update Cloudflare DNS

### 6.1 Get Render Backend URL
In Render Dashboard, your Web Service shows:
```
https://tellbill-api.onrender.com
```

### 6.2 Configure Cloudflare DNS
1. Go to **Cloudflare Dashboard** → your domain `tellbill.app`
2. **DNS** section
3. Add CNAME record:
   ```
   Name: api
   Type: CNAME
   Content: tellbill-api.onrender.com
   TTL: Auto
   ```
4. **Save**
5. Wait 5-10 minutes for DNS propagation

### 6.3 Verify DNS
```bash
nslookup api.tellbill.app
# Should resolve to Render's server
```

---

## ✅ STEP 7: Test Backend Health

```bash
# Test 1: Health Check
curl https://api.tellbill.app/api/health
# Expected: { "status": "ok" }

# Test 2: Signup (with invalid data - should validate)
curl -X POST https://api.tellbill.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","fullName":"Test User"}'

# Test 3: Check logs
# In Render Dashboard → Logs tab
```

---

## 🎨 STEP 8: Build Frontend Production

```bash
cd c:\TellBill
npm run expo:static:build
```

This creates a static export in `dist/` folder

---

## 🚢 STEP 9: Deploy Frontend

### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Option B: Netlify
```bash
npm run build
# Drag dist/ folder to Netlify
```

### Option C: Render Static Site
1. Render Dashboard → "New +" → "Static Site"
2. Name: `tellbill-app`
3. Build Command: `npm run expo:static:build`
4. Publish Directory: `dist`
5. Set Environment: `NODE_ENV=production`

---

## 🔗 STEP 10: Connect Frontend to Backend

Update `.env` in frontend:
```env
EXPO_PUBLIC_BACKEND_URL=https://api.tellbill.app
```

This is already set, but verify after deployment.

---

## 📝 STEP 11: Configure Stripe Webhook

### 11.1 In Stripe Dashboard:
1. Developers → Webhooks
2. "Add endpoint"
3. Endpoint URL: `https://api.tellbill.app/api/webhooks/stripe`
4. Events: Select `charge.succeeded`, `charge.failed`, `charge.refunded`
5. Click "Add endpoint"
6. Get Signing Secret

### 11.2 Add to Render Environment:
```env
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxxxxxx
```

---

## 🔔 STEP 12: End-to-End Testing

### Test 1: Signup → Email Verification
```
1. Visit: https://tellbill.app
2. Signup with real email
3. Check email for verification link
4. Click verification link
5. Should redirect to app, email marked as verified
```

### Test 2: Account Lockout
```
1. Try login with wrong password 5 times
2. Should get "Account locked for 30 minutes"
3. Wait 30 mins (or manually clear in DB)
```

### Test 3: Token Refresh
```
1. Login successfully
2. Wait for access token to expire (15 min)
3. Should automatically refresh
4. Check Render logs for token refresh
```

### Test 4: Payment Processing
```
1. Create invoice
2. Payment page (uses test Stripe)
3. Use test card: 4242 4242 4242 4242
4. Should process successfully
5. Webhook should mark as paid
```

---

## 🔐 STEP 13: Production Hardening

### Security Checklist:
- [ ] SSL Certificate: Render auto-provides (auto-renew)
- [ ] Database backups: Enable in Render PostgreSQL settings
- [ ] Rate limiting: Enabled in errorHandler middleware
- [ ] Sentry error tracking: (Optional) Get DSN, add to env
- [ ] CORS: Double-check allowed domains
- [ ] Stripe: Using test keys (switch to live when ready)

### Monitor Logs:
1. Render Dashboard → Logs
2. Watch for errors in real-time
3. Check database queries

---

## 📊 STEP 14: Set Up Monitoring (Optional)

### Sentry Error Tracking:
```bash
npm install @sentry/node
```

Already partially set up. Get DSN from sentry.io and add to env.

### Uptime Monitoring:
- Use Pingdom or Uptime Robot
- Monitor: `https://api.tellbill.app/api/health`
- Receive alerts if down

---

## 📈 STEP 15: Plan Post-Launch

### Day 1-7:
- Monitor error logs closely
- Check database metrics
- Load test if expecting traffic
- Verify email delivery

### Week 2+:
- Set up automated database backups
- Configure CDN for static assets
- Implement caching strategies
- Plan for scaling

---

## 🆘 Troubleshooting

### Backend Won't Deploy
```
Check: Build logs in Render Dashboard
- npm run server:build must succeed
- All dependencies in package.json
- Node version compatible
```

### Database Connection Failed
```
Check: DATABASE_URL format
- Must be internal URL from Render
- Format: postgresql://user:pass@host:5432/db
- Test with psql command
```

### DNS Not Resolving
```
Check: Cloudflare DNS records
- CNAME is correctly pointing to Render
- Wait 24 hours max for propagation
- Clear browser cache and DNS cache
```

### Stripe Webhooks Not Working
```
Check: 
- Webhook endpoint URL is correct
- Signing secret is set in Render env
- Stripe is sending to correct domain
- Check Render logs for webhook hits
```

---

## ✨ You're Live! 

Once all steps complete:
- ✅ Backend: `https://api.tellbill.app`
- ✅ Frontend: `https://tellbill.app`
- ✅ Database: PostgreSQL on Render
- ✅ Payments: Stripe test mode active
- ✅ Email: Resend integration working

**Next: Switch to Live Stripe Keys**
When ready for real payments, get live keys from Stripe and update Render environment.

---

## 📞 Support
For issues, check:
1. Render status page
2. Stripe webhook logs
3. Cloudflare analytics
4. Server logs in Render dashboard
