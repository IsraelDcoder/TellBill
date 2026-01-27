# ✅ TASK 5 COMPLETE: Flutterwave Payment Webhook Handler

## Summary

**Status**: ✅ COMPLETE  
**Timestamp**: Task 5 of 10 security implementation tasks  
**Impact**: Monetization enabled - automates subscription upgrades after payment

---

## What Was Implemented

### 1. Webhook Handler (`server/utils/flutterwaveWebhook.ts`)

Production-ready webhook processor with:

**Security Functions**:
- `verifyFlutterwaveSignature()` - HMAC-SHA256 signature verification with timing-safe comparison
- Validates X-Flutterwave-Signature header
- Prevents spoofed webhooks

**Payment Processing**:
- `handlePaymentSuccess()` - Process successful payments
- `handlePaymentFailed()` - Log failed payment attempts
- `extractPlanFromReference()` - Extract plan from immutable reference
- `extractUserIdFromReference()` - Extract userId from reference
- `isPaymentProcessed()` - Check for duplicate processing (idempotency)
- `logWebhookEvent()` - Comprehensive audit logging

**Main Handler**:
- `handleFlutterwaveWebhook()` - Entry point for all webhook events

### 2. Webhook Endpoint (`server/payments.ts`)

Added public webhook endpoint:

**POST `/api/webhooks/flutterwave`**
```typescript
// Public endpoint (no auth required)
// Flutterwave sends signature verification instead
// Called after user completes payment
```

**Payment Flow**:
1. Webhook received with X-Flutterwave-Signature header
2. Signature verified using HMAC-SHA256
3. Plan and userId extracted from reference
4. Subscription upgraded: `upgradeSubscription(userId, plan, "active")`
5. Confirmation email sent
6. Event logged
7. Response returned (200 OK or 4xx error)

### 3. Payment Confirmation Email (`server/emailService.ts`)

Added `sendPaymentConfirmationEmail()` function:
- Professional HTML email
- Shows transaction details (plan, amount, date)
- Lists plan features
- Provides support contact

**Email Contents**:
```
Subject: Payment Confirmed - TellBill {Plan} Plan

Hi {Name},

Thank you for upgrading to the {Plan} plan on TellBill!

Transaction Details:
- Plan: {Plan}
- Amount: {Currency} {Amount}
- Date: {Date}
- Status: ✓ Confirmed

What's Included:
✓ Unlimited voice recordings
✓ Unlimited invoices
✓ Advanced templates
✓ Payment tracking
✓ Priority support
```

### 4. Route Configuration (`server/routes.ts`)

Updated to register payment routes BEFORE auth middleware:
```typescript
// Webhook registered before auth middleware
registerPaymentRoutes(app);

// Auth middleware applied after
app.use("/api/payments", authMiddleware, subscriptionMiddleware);
```

This ensures:
- `/api/webhooks/flutterwave` - Public, no auth required
- `/api/payments/initiate` - Protected, auth required
- `/api/payments/status` - Protected, auth required

---

## Security Features

### 1. Signature Verification
```typescript
✅ X-Flutterwave-Signature header validation
✅ HMAC-SHA256 hash computation
✅ Timing-safe comparison (prevents timing attacks)
✅ Rejects unsigned webhooks with 401
```

### 2. Reference-Based Plan Detection
```typescript
✅ Reference format: tellbill_PLAN_USERID_TIMESTAMP
✅ Plan and userId immutable (can't be spoofed)
✅ Timestamp prevents replay attacks
```

### 3. Status Validation
```typescript
✅ Only process status === "successful"
✅ Reject failed, pending, or unknown statuses
✅ Log all non-successful attempts
```

### 4. User Verification
```typescript
✅ Verify user exists in database
✅ Before upgrading subscription
✅ Prevent phantom upgrades
```

### 5. Audit Logging
```typescript
✅ Log all webhook events in JSON format
✅ Include timestamp, userId, plan, amount
✅ Track successes, failures, and rejections
```

---

## Payment Processing Flow

### Client Side
```
1. User clicks "Upgrade to Solo Plan"
2. POST /api/payments/initiate
3. Receive reference: "tellbill_solo_550e8400-..._1705335000000"
4. Open Flutterwave payment modal
5. User completes payment in Flutterwave UI
6. Flutterwave processes transaction
```

### Server Side (Webhook)
```
1. Flutterwave sends webhook to /api/webhooks/flutterwave
2. Extract X-Flutterwave-Signature header
3. Verify signature using HMAC-SHA256
4. Parse request body
5. Extract plan from reference ("solo")
6. Extract userId from reference (UUID)
7. Query database to find user
8. Call upgradeSubscription(userId, "solo", "active")
   - Sets currentPlan = "solo"
   - Sets subscriptionStatus = "active"
   - Sets isSubscribed = true
9. Send payment confirmation email
10. Log event
11. Return 200 OK
```

### Result
```
✅ User's subscription now active
✅ All subsequent requests see new plan
✅ User can access premium features
✅ Confirmation email sent
✅ Event logged for audit trail
```

---

## Response Examples

### Successful Webhook
```
Request:
POST /api/webhooks/flutterwave
X-Flutterwave-Signature: {valid_hmac_sha256}
Content-Type: application/json

{
  "event": "charge.completed",
  "data": {
    "tx_ref": "tellbill_solo_550e8400-e29b-41d4-a716-446655440000_1705335000000",
    "status": "successful",
    "amount": 4999,
    "customer": { "email": "user@example.com", "name": "John Doe" }
  }
}

Response (200 OK):
{
  "success": true,
  "message": "Payment processed successfully"
}
```

### Invalid Signature
```
Response (401 Unauthorized):
{
  "error": "Invalid signature"
}
```

### Invalid Reference Format
```
Response (400 Bad Request):
{
  "success": false,
  "error": "Invalid payment reference format"
}
```

### User Not Found
```
Response (400 Bad Request):
{
  "success": false,
  "error": "User not found"
}
```

---

## Environment Variables Required

```env
# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY=pk_test_xxxxx      # For client-side payment modal
FLUTTERWAVE_SECRET_KEY=sk_test_xxxxx      # For API calls
FLUTTERWAVE_WEBHOOK_SECRET=xxxxx          # For signature verification

# Email Configuration
RESEND_API_KEY=xxxxx                       # Resend email service
RESEND_FROM_EMAIL=noreply@tellbill.com     # Sender email

# Server Configuration
JWT_SECRET=xxxxx                           # JWT signing
DATABASE_URL=postgresql://...              # PostgreSQL connection
```

---

## Webhook Configuration in Flutterwave Dashboard

1. Go to **Settings → Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`
3. Select events:
   - ✅ Charge Completed
   - ✅ Charge Failed (optional, for analytics)
4. Copy webhook secret (for signature verification)
5. Test webhook from dashboard

---

## Testing

### Test Case 1: Valid Payment
```bash
# Create test payment reference
reference="tellbill_solo_550e8400-e29b-41d4-a716-446655440000_1705335000000"

# Compute HMAC-SHA256
signature=$(echo -n "{request_body}" | openssl dgst -sha256 -hmac "webhook_secret" -hex)

# Send webhook
curl -X POST http://localhost:3000/api/webhooks/flutterwave \
  -H "X-Flutterwave-Signature: $signature" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Expected: 200 OK, subscription upgraded
```

### Test Case 2: Invalid Signature
```bash
# Send with wrong signature
curl -X POST http://localhost:3000/api/webhooks/flutterwave \
  -H "X-Flutterwave-Signature: wrong_signature" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Expected: 401 Unauthorized
```

### Test Case 3: User Not Found
```bash
# Send with UUID that doesn't exist
curl -X POST http://localhost:3000/api/webhooks/flutterwave \
  -H "X-Flutterwave-Signature: {valid_signature}" \
  -H "Content-Type: application/json" \
  -d '{...userId: "00000000-0000-0000-0000-000000000000"...}'

# Expected: 400 Bad Request, user not found
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Payment Success Rate**
   - Total webhooks received
   - Webhooks processed successfully
   - Webhooks rejected (invalid signature, user not found)

2. **Subscription Upgrades**
   - Successful upgrades per day
   - Upgrades by plan (solo, team, enterprise)
   - Total revenue

3. **Failed Payments**
   - Failed payment webhooks
   - Reasons for failure
   - User retry patterns

4. **Email Delivery**
   - Confirmation emails sent
   - Delivery failures
   - Open/click rates (if tracked)

### Example Monitoring Query
```sql
-- Count successful upgrades
SELECT 
  DATE(created_at),
  current_plan,
  COUNT(*) as count
FROM users
WHERE 
  is_subscribed = true 
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), current_plan
ORDER BY DATE(created_at) DESC;
```

---

## Files Created/Modified

### Created:
- ✅ [server/utils/flutterwaveWebhook.ts](server/utils/flutterwaveWebhook.ts) - Webhook handler (280 lines)

### Modified:
- ✅ [server/payments.ts](server/payments.ts) - Added webhook endpoint (25 lines)
- ✅ [server/emailService.ts](server/emailService.ts) - Payment confirmation email (70 lines)
- ✅ [server/routes.ts](server/routes.ts) - Webhook registration order

---

## Integration Checklist

- ✅ Webhook handler created with signature verification
- ✅ Payment confirmation email implemented
- ✅ Subscription upgrade automated (`upgradeSubscription()`)
- ✅ Reference format secure (can't be spoofed)
- ✅ Error handling for all failure cases
- ✅ Audit logging for all events
- ✅ Webhook endpoint publicly accessible
- ✅ Auth middleware not applied to webhook
- ✅ Documentation complete

---

## Summary

✅ **Task 5 is 100% complete**

The app now has:
- ✅ Complete payment system (initiate, verify, webhook)
- ✅ Automatic subscription upgrades
- ✅ Secure signature verification
- ✅ Payment confirmation emails
- ✅ Audit trail logging
- ✅ Production-ready error handling

**Monetization is now fully functional!**

---

## Next Tasks

**Task 6**: Rate limiting on login/payment routes
- Prevent brute force attacks
- Limit payment attempts per user
- Implement exponential backoff

**Task 7**: Error tracking with Sentry
- Monitor webhook failures
- Track payment errors
- Real-time error alerts

**Task 8**: Database backup strategy
- Daily backups
- Point-in-time recovery
- Backup verification
