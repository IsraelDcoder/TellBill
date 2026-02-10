# 🚀 TellBill Deployment: Render + Supabase

**Cost Breakdown:**
- Render Backend: $7/month
- Supabase Database: FREE (up to 2 projects)
- Total: ~$7/month ✨

---

## ✅ You Have This Already

```
Supabase Database Connection:
postgresql://postgres:ThisisTellBill21@db.uwlxzwvggvqqsbgukjsz.supabase.co:5432/postgres

Render Backend: In progress
```

---

## 📋 STEP 1: Complete Render Web Service Setup

**You should be on this page:** https://dashboard.render.com/web/new

### Fill in:

| Field | Value |
|-------|-------|
| **Name** | `tellbill-api` |
| **Project** | Leave blank (optional) |
| **Language** | **Change to: Node** ⚠️ |
| **Branch** | `main` |
| **Root Directory** | Leave blank |
| **Region** | Oregon or closest to you |

### Build Settings:
```
Build Command: npm run server:build
Start Command: node server_dist/index.js
```

### Instance Type:
```
Select: Starter ($7/month)
```

**Then Click: "Create Web Service"** and wait for it to build (~5 min)

---

## ⏳ While Render Builds...

Note the **temporary URL** Render assigns. It will be something like:
```
https://tellbill-api-xxxx.onrender.com
```

Save this for Step 3.

---

## 📝 STEP 2: Add Environment Variables to Render

Once deployed, in Render Dashboard → Your Service → **Environment**:

Add these variables (copy/paste exactly):

```
NODE_ENV=production
PORT=3000

EXPO_PUBLIC_BACKEND_URL=https://tellbill-api.onrender.com
EXPO_PUBLIC_BACKEND_IP=tellbill-api.onrender.com
EXPO_PUBLIC_APP_URL=https://tellbill.app

DATABASE_URL=postgresql://postgres:ThisisTellBill21@db.uwlxzwvggvqqsbgukjsz.supabase.co:5432/postgres

JWT_SECRET=dkWIzVVz9q3D7yiXkohBZi6RhjLNhjMFGiZDlnUwzSoWCmhz78Qcf7wVHN0ozimen2wxxEF4StpMjATCnnYg2g==
JWT_REFRESH_SECRET=RR2z9qfJOypBgsT5HiM0gYV4kIs3UINcA5mhqXEgwF+ZV7Ta545X5NkrcBhKTEEzXCzQ/YBGPbCUJ/TJda7itA==

ALLOWED_DOMAINS=tellbill.app,api.tellbill.app,www.tellbill.app,app.tellbill.app

STRIPE_SECRET_KEY=sk_test_[GET_FROM_YOUR_STRIPE_ACCOUNT]
STRIPE_PUBLISHABLE_KEY=pk_test_[GET_FROM_YOUR_STRIPE_ACCOUNT]
STRIPE_WEBHOOK_SECRET=whsec_test_

RESEND_API_KEY=[GET_FROM_RESEND_DASHBOARD]
RESEND_FROM_EMAIL=noreply@tellbill.app

SENTRY_DSN=
```

**Then Save** and Render will auto-redeploy with new env vars

---

## ✅ STEP 3: Run Database Migrations

Once environment variables are saved and service restarts:

1. In Render Dashboard → Your Service → **Shell** tab
2. Run this command:
   ```bash
   npm run db:push
   ```
3. Wait for output:
   ```
   ✓ Migration 0001_initial applied
   ✓ Migration 0017_add_security_fields applied
   ✓ Migration 0018_add_webhook_and_refresh_tokens applied
   ...
   ✓ All migrations applied successfully!
   ```

---

## 🧪 STEP 4: Test Backend Health

1. Open browser
2. Go to: `https://tellbill-api.onrender.com/api/health`
3. Should see: `{"status":"ok"}`

**If you get an error:**
- Check Render Logs tab for errors
- Verify DATABASE_URL is set correctly
- Ensure all migrations ran

---

## 🌐 STEP 5: Configure Cloudflare DNS

1. Go to **Cloudflare Dashboard** → your domain `tellbill.app`
2. Click **DNS**
3. Add CNAME record:
   ```
   Name: api
   Type: CNAME
   Content: tellbill-api.onrender.com
   TTL: Auto
   Proxy: DNS only (gray cloud)
   ```
4. Click **Save**
5. Wait 5-10 minutes for propagation

### Verify DNS Works:
```bash
# In terminal/PowerShell
nslookup api.tellbill.app

# Or test directly:
curl https://api.tellbill.app/api/health
```

Expected: `{"status":"ok"}`

---

## 🔐 STEP 6: Configure Stripe Webhook

1. Go to **Stripe Dashboard**
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. **Endpoint URL:**
   ```
   https://api.tellbill.app/api/webhooks/stripe
   ```
5. **Events to send:**
   - charge.succeeded
   - charge.failed
   - charge.refunded
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add to Render Environment:
   ```
   STRIPE_WEBHOOK_SECRET=[paste_the_signing_secret]
   ```

---

## 🔄 STEP 7: Frontend Deployment

### Build Frontend:
```bash
cd c:\TellBill
npm run expo:static:build
```

Wait for build to complete (~5 min).

### Option A: Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Option B: Deploy to Netlify
- Drag `dist/` folder to https://netlify.com

### Option C: Deploy to Render Static Site
1. Render Dashboard → "New +" → "Static Site"
2. Name: `tellbill-frontend`
3. Build Command: `npm run expo:static:build`
4. Publish Directory: `dist`
5. Deploy

---

## 📧 STEP 8: Get Resend API Key

1. Go to **https://resend.com**
2. Click **API Keys**
3. Create new API key
4. Copy the key
5. Add to Render Environment:
   ```
   RESEND_API_KEY=[paste_key_here]
   ```

---

## ✅ Final Checklist

- [ ] Render web service created and deployed
- [ ] Environment variables added to Render
- [ ] Database migrations ran successfully
- [ ] Backend health check working (`/api/health`)
- [ ] DNS configured (api.tellbill.app → Render)
- [ ] Stripe webhook configured
- [ ] Frontend built
- [ ] Frontend deployed
- [ ] Resend API key added

---

## 🧪 Testing (Full Flow)

Once everything is deployed:

### Test 1: Signup
```
1. Visit https://tellbill.app
2. Click Signup
3. Enter email, password, name
4. Click "Sign up"
5. Check email for verification link
```

### Test 2: Email Verification
```
1. Click verification link in email
2. Should redirect back to app
3. Email should be marked verified
```

### Test 3: Login
```
1. Click Login
2. Enter email and password
3. Should see dashboard
```

### Test 4: Account Lockout
```
1. Login with WRONG password 5 times
2. Should see "Account locked for 30 minutes"
```

### Test 5: Payment
```
1. Create invoice
2. Click "Pay Now"
3. Use test card: 4242 4242 4242 4242
4. Should process successfully
```

---

## 🆘 Troubleshooting

**Backend won't deploy:**
- Check "Language" is set to "Node" (not Docker)
- Check Render Logs for error messages
- Verify build command: `npm run server:build`

**Database connection failed:**
- Test connection locally first: 
  ```bash
  psql postgresql://postgres:ThisisTellBill21@db.uwlxzwvggvqqsbgukjsz.supabase.co:5432/postgres
  ```
- Verify DATABASE_URL in Render env is exactly correct
- Check Supabase is running

**API not responding:**
- Check https://api.tellbill.app/api/health
- Check Render Logs
- Verify migrations ran

**DNS not resolving:**
- Wait up to 24 hours for TTL
- Clear browser cache: Ctrl+Shift+Delete
- Verify CNAME record in Cloudflare

---

## 💰 Total Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| Render Backend | $7/month | Starter plan |
| Supabase Database | FREE | Up to 2 free projects |
| Stripe | 2.9% + $0.30 | Per transaction |
| Resend Emails | FREE | 100/day included |
| Cloudflare DNS | FREE | Domain management |
| **TOTAL** | **$7/month** | Way cheaper! |

---

## 🎉 You're Live!

Once all steps complete:
- ✅ Backend: `https://api.tellbill.app`
- ✅ Frontend: `https://tellbill.app` (or your Vercel URL)
- ✅ Database: Supabase PostgreSQL
- ✅ Payments: Stripe (test mode)
- ✅ Emails: Resend

**Next: Switch to Live Stripe Keys**
When ready for real money, get live keys from Stripe and update Render.

---

**Any issues? Check Render Logs and Supabase Dashboard for error details.**
