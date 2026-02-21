# TellBill Early Access - Testing Guide

## 🚀 Quick Start Testing

### Step 1: Start the Backend
```bash
cd /c/TellBill
npm run server:dev
```

Expected output:
```
[Server] Starting TellBill backend (development)
[Server] ✅ Environment Variables Status:
  NODE_ENV: development
  DATABASE_URL: ✅ SET
  GROQ_API_KEY: ✅ SET
  ...
```

### Step 2: Open the Landing Page
Open browser and navigate to:
```
http://localhost:3000/early-access
```

### Step 3: Test the Form
1. **Open browser console** (F12 → Console tab)
2. **Look for the log message:**
   ```
   [Early Access] Submitting to: http://localhost:3000/api/early-access
   ```
   This confirms the backend URL is correctly detected.

3. **Fill out the form:**
   - First Name: `John Doe`
   - Email: `john@example.com`
   - Type of Work: `Software Developer`

4. **Click "Reserve My Spot"**

### Step 4: Verify Success
You should see:
- ✅ "Securing your spot..." loading message
- ✅ Form hidden and replaced with: "You're on the list"
- ✅ Browser logs: `[Early Access] Success!`
- ✅ Database record created

### Step 5: Verify Email
Check if email was sent (requires `RESEND_API_KEY`):
```bash
# Check Resend dashboard for delivery status
# Email should be sent to: john@example.com
```

---

## 🔧 Debugging Guide

### Issue: "Cannot reach the server"

**In Browser Console:**
```javascript
// Check what URL was used
const url = 'http://localhost:3000/api/early-access';
console.log('Trying to reach:', url);

// Try manual fetch
fetch(url, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({name: 'Test', email: 'test@example.com'})
})
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e));
```

**Solutions:**
1. Make sure backend is running: `npm run server:dev`
2. Check port 3000 is not blocked: `netstat -an | grep 3000`
3. Verify CORS is enabled (check server logs for CORS errors)

### Issue: CORS Error in Console

**Error:** `Access to XMLHttpRequest at 'http://localhost:3000/api/early-access' from origin 'http://localhost:3001' has been blocked by CORS policy`

**Solution:**
- The backend CORS is configured for `localhost:*`
- This should work automatically in development
- Check server logs for CORS configuration

### Issue: Email Not Sent

**Check:**
1. `RESEND_API_KEY` is set in `.env`
2. `RESEND_FROM_EMAIL` is configured
3. Check Resend dashboard for delivery status
4. Look for errors in backend logs

---

## ✅ Database Verification

### Check if signup was recorded:

```sql
-- Connect to your database
SELECT * FROM early_access ORDER BY created_at DESC LIMIT 5;

-- Expected output:
-- | email           | name     | trade                | created_at          |
-- |-----------------|----------|----------------------|---------------------|
-- | john@example.com| John Doe | software_developer   | 2026-02-21 10:30:00 |
```

### Count total signups:
```sql
SELECT COUNT(*) as total_signups FROM early_access;
```

---

## 🎯 Full Test Scenario

### Scenario 1: Happy Path (Success)
1. ✅ Start backend
2. ✅ Open /early-access
3. ✅ Fill form with valid data
4. ✅ Submit
5. ✅ See success message
6. ✅ Email received
7. ✅ Database record created

### Scenario 2: Validation (Form Errors)
1. Leave "First Name" empty
2. Click "Reserve My Spot"
3. ✅ Should see error: "Please enter your name"
4. ✅ Form not submitted

### Scenario 3: Network Error
1. Stop the backend server
2. Try to submit form
3. ✅ Should see error: "Cannot reach the server..."
4. ✅ Button re-enabled for retry

### Scenario 4: Invalid Email
1. Enter email: `notanemail`
2. Click "Reserve My Spot"
3. ✅ Should see error: "Please enter a valid email"
4. ✅ Form not submitted

---

## 📊 Browser Console Expected Logs

When form is submitted successfully:
```javascript
[Early Access] Submitting to: http://localhost:3000/api/early-access
[Early Access] Response status: 200
[Early Access] Success!
```

When form has errors:
```javascript
[Early Access] Submitting to: http://localhost:3000/api/early-access
[Early Access] Response status: 400
[Early Access] Error response: Email already registered
```

---

## 🔒 Security Testing

### Test 1: SQL Injection
- Email: `test'+DROP TABLE users;--@example.com`
- Expected: Safe input handling, just treated as invalid email

### Test 2: XSS Prevention
- Name: `<script>alert('xss')</script>`
- Expected: Safely stored as plain text, no execution

### Test 3: CSRF Protection
- The form uses Content-Type: application/json
- Backend validates origin via CORS
- No hidden form tokens needed for API

---

## 📱 Mobile Testing

### Desktop (1920px wide)
- ✅ 2-column form
- ✅ Full spacing
- ✅ Feature cards in grid

### Tablet (768px wide)
- ✅ 1-column form  
- ✅ Reduced spacing
- ✅ Feature cards stack

### Mobile (375px wide)
- ✅ Full-width form
- ✅ Minimal padding
- ✅ Touch-friendly button size

---

## 💡 Performance Checklist

- [ ] Page loads in < 2 seconds
- [ ] Form submits in < 3 seconds
- [ ] Email delivered in < 30 seconds
- [ ] No console errors
- [ ] No network waterfalls (everything parallelized)

---

## 🚀 Production Deployment Checklist

Before going live:
- [ ] Backend is hosted (Render, Railway, etc.)
- [ ] `ALLOWED_DOMAINS` environment variable set
- [ ] `RESEND_API_KEY` configured
- [ ] `RESEND_FROM_EMAIL` set
- [ ] Database backup configured
- [ ] Error monitoring (Sentry) enabled
- [ ] Test form submission from production URL
- [ ] Email delivery verified
- [ ] CORS working with your domain
- [ ] SSL certificate valid

---

## 📞 Support

If you encounter issues:

1. **Check server logs:** Run backend and look for errors
2. **Check browser console:** F12 → Console tab
3. **Check network tab:** F12 → Network tab, look for failed requests
4. **Verify environment variables:** Check `.env` is set correctly
5. **Test database connectivity:** Run `npm run db:verify`

---

Last Updated: February 21, 2026
