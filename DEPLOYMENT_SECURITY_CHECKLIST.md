# 🔒 TELLBILL SECURITY CHECKLIST - PRODUCTION DEPLOYMENT

## Pre-Deployment Verification

### Environment Variables ✓
- [ ] `JWT_SECRET` - Set to strong random value (32+ bytes)
- [ ] `NODE_ENV` - Set to "production"
- [ ] `ALLOWED_DOMAINS` - Set to comma-separated production domains
- [ ] `DATABASE_URL` - PostgreSQL with SSL enabled
- [ ] `SENTRY_DSN` - Error tracking configured
- [ ] `FLUTTERWAVE_SECRET_KEY` - Payment provider key
- [ ] `FLUTTERWAVE_PUBLIC_KEY` - Payment provider public key
- [ ] `RESEND_API_KEY` - Email service key
- [ ] `BACKUP_DIR` - Backup directory path set
- [ ] `.env` file is NOT committed to Git

### Database Setup ✓
- [ ] PostgreSQL 12+ running
- [ ] Database SSL enabled in connection string
- [ ] All migrations applied (`npm run db:migrate`)
- [ ] Connection pool configured (20 max connections)
- [ ] Backup tables created
- [ ] Database user has appropriate permissions
- [ ] Regular backup testing verified

### Application Build ✓
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] All dependencies installed (`npm install`)
- [ ] No high-severity vulnerabilities (`npm audit`)
- [ ] Environment variables loaded successfully
- [ ] Server starts without errors (`npm start`)
- [ ] All routes accessible and responding

---

## Security Features Verification

### 1. Authentication (JWT) ✓
- [ ] JWT secret is 256-bit minimum
- [ ] Token expiration set to 7 days
- [ ] Tokens stored in AsyncStorage (mobile) / secure storage
- [ ] Auth middleware applied to protected routes
- [ ] Logout invalidates tokens
- [ ] Token refresh working
- [ ] Unauthorized requests return 401 status

**Test:**
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.token')

# Use token in protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/me
# Should return 200 user info

# Invalid token should return 401
curl -H "Authorization: Bearer invalid" http://localhost:3000/api/me
# Should return 401 Unauthorized
```

### 2. Input Validation ✓
- [ ] Email validation applied
- [ ] Phone number validation applied
- [ ] Amount/decimal validation applied
- [ ] UUID validation applied
- [ ] String length limits enforced
- [ ] SQL identifiers validated
- [ ] Validation errors return 400 Bad Request
- [ ] Validation functions tested

**Test:**
```bash
# Invalid email should fail
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"pass123"}'
# Should return 400

# Invalid amount should fail
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":"not-a-number"}'
# Should return 400
```

### 3. Subscription Verification ✓
- [ ] Server enforces subscription limits
- [ ] Plan features checked before access
- [ ] Request count limits enforced
- [ ] Expired subscriptions block feature access
- [ ] Automatic downgrade working
- [ ] Plan change updates limits immediately
- [ ] Subscription status visible in API responses

**Test:**
```bash
# Free user tries to create 2nd project (limit 1)
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $FREETIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Project2"}'
# Should return 403 or subscription error
```

### 4. Payment Webhook Security ✓
- [ ] Webhook signature verification enabled
- [ ] HMAC-SHA256 validation working
- [ ] Replay attacks prevented (timestamp checking)
- [ ] Webhook payload logged for audit
- [ ] Successful payment triggers subscription upgrade
- [ ] Failed payment sends email notification
- [ ] Webhook retry handling working

**Test:**
```bash
# Invalid signature should be rejected
curl -X POST http://localhost:3000/api/webhook/flutterwave \
  -H "Content-Type: application/json" \
  -H "verificationhash: invalid-hash" \
  -d '{"event":"charge.completed"}'
# Should return 403 Forbidden
```

### 5. Rate Limiting ✓
- [ ] Login endpoint rate limited (5/minute)
- [ ] Signup endpoint rate limited (3/minute)
- [ ] Payment endpoint rate limited (10/hour)
- [ ] Webhook endpoint rate limited (20/minute)
- [ ] Rate limit headers present in response
- [ ] 429 Too Many Requests returned when exceeded
- [ ] Rate limit resets correctly
- [ ] IP-based tracking working

**Test:**
```bash
# Send 10 login attempts rapidly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' -s -o /dev/null -w "Status: %{http_code}\n"
done
# First 5 return 401 (wrong password)
# After 5th: return 429 (rate limited)
```

### 6. Sentry Integration ✓
- [ ] Sentry initialized on startup
- [ ] Error tracking working
- [ ] Profiling enabled
- [ ] User context captured
- [ ] Breadcrumbs logged
- [ ] Alert rules configured
- [ ] Critical errors trigger alerts
- [ ] Sentry dashboard accessible

**Test:**
```bash
# Trigger an error (divide by zero, unhandled exception)
curl -X POST http://localhost:3000/api/test-error

# Check Sentry dashboard - error should appear
# Verify user context, breadcrumbs, and profiling data
```

### 7. Database Backups ✓
- [ ] Backup directory exists and is writable
- [ ] Daily backups scheduled
- [ ] Weekly backups scheduled
- [ ] Monthly backups scheduled
- [ ] Gzip compression working
- [ ] Backup files accessible
- [ ] Restore procedure tested
- [ ] Backup retention policy enforced

**Test:**
```bash
# Create manual backup
npm run backup:now

# Verify backup created
ls -lah backups/

# Verify backup can be restored
npm run backup:verify

# Test backup file integrity
gunzip -t backups/*.sql.gz
# Should extract without errors
```

### 8. Input Sanitization ✓
- [ ] XSS prevention working (HTML escaping)
- [ ] HTML tags stripped from input
- [ ] Dangerous attributes removed
- [ ] Command injection prevented
- [ ] Path traversal prevented
- [ ] Email header injection prevented
- [ ] NoSQL injection prevented
- [ ] Batch sanitization working

**Test:**
```bash
# XSS attempt should be escaped
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}'
# Should be stored as escaped text, not executable

# Path traversal attempt should be blocked
curl -X POST http://localhost:3000/api/file-upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@../../etc/passwd"
# Should return 400 or reject the path
```

### 9. Security Headers ✓
- [ ] Content-Security-Policy header present
- [ ] X-Frame-Options: DENY header present
- [ ] X-XSS-Protection header present
- [ ] X-Content-Type-Options: nosniff header present
- [ ] Referrer-Policy header present
- [ ] Permissions-Policy header present
- [ ] Headers on all responses
- [ ] Headers prevent XSS and clickjacking

**Test:**
```bash
# Check security headers
curl -I http://localhost:3000/

# Should show:
# Content-Security-Policy: ...
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: ...
```

### 10. CORS Security ✓
- [ ] CORS middleware applied
- [ ] Development allows localhost only
- [ ] Production uses ALLOWED_DOMAINS
- [ ] Origin validation working
- [ ] Unauthorized origins rejected (403)
- [ ] Preflight requests rate limited
- [ ] CORS headers on allowed requests
- [ ] Violations logged to Sentry

**Test:**
```bash
# Authorized origin (development)
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3000/api/test
# Should return 200 with CORS headers

# Unauthorized origin
curl -H "Origin: https://attacker.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3000/api/test
# Should return 403 (production) or 200 (development)

# Excessive preflight requests (rate limiting)
for i in {1..120}; do
  curl -X OPTIONS http://localhost:3000/api/test \
    -H "Origin: http://localhost:3000" &
done
# After ~100: requests should return 429
```

---

## Performance Verification

### API Response Times ✓
- [ ] Login endpoint: < 200ms
- [ ] Project creation: < 300ms
- [ ] Invoice creation: < 300ms
- [ ] List endpoints: < 500ms
- [ ] Database queries: < 100ms

**Test:**
```bash
# Measure login endpoint
time curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}'
```

### Database Performance ✓
- [ ] Connection pool healthy (< 20 active)
- [ ] Query response times acceptable
- [ ] Slow query log enabled
- [ ] Database maintenance scheduled

**Test:**
```bash
# Check active connections
psql -d tellbill -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -d tellbill -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
```

---

## Monitoring & Alerting

### Sentry ✓
- [ ] Dashboard accessible
- [ ] Real-time error monitoring
- [ ] Alert rules configured
- [ ] Email notifications working
- [ ] Slack integration (optional)
- [ ] Error trending tracked

### Logs ✓
- [ ] Application logs saved
- [ ] Error logs captured
- [ ] Access logs recorded
- [ ] Log rotation configured
- [ ] Sensitive data not logged
- [ ] Logs accessible for audit

### Metrics ✓
- [ ] Request count tracked
- [ ] Error rate monitored
- [ ] Response time tracked
- [ ] Database connection usage monitored
- [ ] Rate limit hits tracked
- [ ] Backup completion status tracked

---

## Post-Launch Monitoring (First 24 Hours)

### Every Hour
- [ ] Check Sentry for new errors
- [ ] Verify API responding normally
- [ ] Check database is healthy
- [ ] Monitor rate limit metrics

### Every 4 Hours
- [ ] Review error logs
- [ ] Check backup completion
- [ ] Verify no unusual traffic patterns
- [ ] Monitor API response times

### Daily
- [ ] Full security check
- [ ] Database backup verification
- [ ] Review all failed requests
- [ ] Update monitoring dashboards

---

## Emergency Procedures

### If Server Down
1. [ ] Check server logs: `journalctl -u tellbill -n 100`
2. [ ] Restart server: `systemctl restart tellbill`
3. [ ] Check database connection: `psql $DATABASE_URL`
4. [ ] Check disk space: `df -h`
5. [ ] Check memory: `free -h`
6. [ ] Contact deployment team

### If Database Corrupted
1. [ ] Stop application
2. [ ] Restore from latest backup: `npm run backup:restore`
3. [ ] Verify data integrity
4. [ ] Restart application
5. [ ] Test all features
6. [ ] Create new backup

### If Breach Suspected
1. [ ] Enable enhanced logging
2. [ ] Check Sentry for unauthorized access
3. [ ] Rotate JWT_SECRET (users will need to re-login)
4. [ ] Review access logs
5. [ ] Check payment logs for fraud
6. [ ] Notify security team

### If Payment System Down
1. [ ] Check Flutterwave status
2. [ ] Verify webhook endpoint accessible
3. [ ] Check network connectivity
4. [ ] Enable payment maintenance mode
5. [ ] Notify users
6. [ ] Resume when service restored

---

## Launch Day Checklist

### Morning (Before Launch)
- [ ] All systems operational
- [ ] Database backups verified
- [ ] Sentry monitoring active
- [ ] Rate limits tested
- [ ] CORS origins configured
- [ ] SSL certificates valid
- [ ] DNS records correct
- [ ] CDN configured (if applicable)

### Launch Time
- [ ] Server started
- [ ] Health check endpoints responding
- [ ] Database connected
- [ ] Backups running
- [ ] Monitoring dashboards live
- [ ] Alert rules armed
- [ ] On-call engineers ready

### Post-Launch
- [ ] Monitor error rate (target: < 1%)
- [ ] Monitor response times (target: < 500ms)
- [ ] Monitor database performance
- [ ] Check Sentry dashboard every 15 mins
- [ ] Be ready to rollback if critical issues

---

## Sign-Off

**Security Checklist Completed By:** ___________________  
**Date:** ___________________  
**Time:** ___________________  

**All 10 Security Tasks Verified:** ✅

**Application Status:** 🚀 APPROVED FOR PRODUCTION

---

*This checklist should be completed before every production deployment.*  
*Keep this document for audit trail and compliance verification.*
