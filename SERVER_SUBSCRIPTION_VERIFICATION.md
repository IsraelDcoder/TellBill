# ✅ SERVER-SIDE SUBSCRIPTION VERIFICATION

## Overview

Comprehensive server-side subscription plan verification system that enforces plan limits and feature access on the backend (never trust the client).

---

## Components

### 1. Subscription Manager (`server/utils/subscriptionManager.ts`)

Core utilities for managing subscriptions:

**Functions**:
- `getUserSubscription(userId)` - Fetch subscription status from database
- `verifyFeatureAccess(userId, featureName)` - Check if user has feature
- `verifyPlanLimit(userId, limitType, currentUsage)` - Check if user exceeded limits
- `upgradeSubscription(userId, newPlan)` - Update plan after payment
- `downgradeSubscription(userId, newPlan)` - Downgrade plan on cancellation
- `cancelSubscription(userId)` - Cancel subscription
- `isSubscriptionActive(userId)` - Check if subscription is active
- `isFreeTier(userId)` - Check if user is on free plan
- `getUserPlan(userId)` - Get current plan

**Plan Features**:
```typescript
{
  free: {
    voiceRecordings: 3,
    invoices: 3,
    projectsCreated: 3,
    teamMembers: 1,
    storage: 1, // GB
    features: { voiceRecording, basicInvoicing, emailSupport, ... }
  },
  solo: {
    voiceRecordings: Infinity,
    invoices: Infinity,
    projectsCreated: Infinity,
    teamMembers: 1,
    storage: 100,
    features: { ... + advancedTemplates, paymentTracking, ... }
  },
  team: {
    teamMembers: 10,
    storage: 500,
    features: { ... + teamManagement, prioritySupport, ... }
  },
  enterprise: {
    teamMembers: Infinity,
    storage: Infinity,
    features: { ... + apiAccess }
  }
}
```

### 2. Subscription Middleware (`server/utils/subscriptionMiddleware.ts`)

Express middleware for subscription checks:

**Middleware Functions**:
- `subscriptionMiddleware` - Attaches subscription info to request (non-blocking)
- `requireFeature(featureName)` - Requires specific feature
- `requirePlan(...plans)` - Requires specific plan or higher
- `requirePaidPlan()` - Blocks free tier users
- `checkUsageLimit(req, limitType, currentUsage)` - Check quota

**Error Responses** (403 Forbidden):
```json
{
  "success": false,
  "error": "Upgrade required",
  "message": "This feature requires one of these plans: solo, team",
  "currentPlan": "free",
  "upgradeRequired": true
}
```

---

## Applied Protection

### 1. Routes with Subscription Middleware
All protected routes now have subscription checks:
```typescript
app.use("/api/transcribe", authMiddleware, subscriptionMiddleware);
app.use("/api/invoices", authMiddleware, subscriptionMiddleware);
app.use("/api/projects", authMiddleware, subscriptionMiddleware);
app.use("/api/inventory", authMiddleware, subscriptionMiddleware);
app.use("/api/payments", authMiddleware, subscriptionMiddleware);
```

### 2. Voice Recording Limits (`server/transcription.ts`)
```typescript
// Check voice recording quota before accepting transcription
const limitCheck = await checkUsageLimit(req, "voiceRecordings", 0);
if (!limitCheck.allowed) {
  return res.status(403).json({
    error: "Voice recording limit reached",
    upgradeRequired: true
  });
}
```

### 3. Invoice Send Limits (`server/invoices.ts`)
```typescript
// Check invoice send quota before allowing send
const limitCheck = await checkUsageLimit(req, "invoices", 0);
if (!limitCheck.allowed) {
  return res.status(403).json({
    error: "Invoice limit reached",
    upgradeRequired: true
  });
}
```

### 4. Project Creation Limits (`server/projects.ts`)
```typescript
// Check project creation quota before allowing creation
const limitCheck = await checkUsageLimit(req, "projectsCreated", 0);
if (!limitCheck.allowed) {
  return res.status(403).json({
    error: "Project limit reached",
    upgradeRequired: true
  });
}
```

---

## Plan Comparison

| Feature | Free | Solo | Team | Enterprise |
|---------|------|------|------|------------|
| **Voice Recordings** | 3 | ∞ | ∞ | ∞ |
| **Invoices** | 3 | ∞ | ∞ | ∞ |
| **Projects** | 3 | ∞ | ∞ | ∞ |
| **Team Members** | 1 | 1 | 10 | ∞ |
| **Storage** | 1 GB | 100 GB | 500 GB | ∞ GB |
| **Voice Recording** | ✅ | ✅ | ✅ | ✅ |
| **Basic Invoicing** | ✅ | ✅ | ✅ | ✅ |
| **Email Support** | ✅ | ✅ | ✅ | ✅ |
| **Advanced Templates** | ❌ | ✅ | ✅ | ✅ |
| **Team Management** | ❌ | ❌ | ✅ | ✅ |
| **Payment Tracking** | ❌ | ✅ | ✅ | ✅ |
| **Recurring Invoices** | ❌ | ✅ | ✅ | ✅ |
| **Invoice Automation** | ❌ | ✅ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Custom Branding** | ❌ | ✅ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ✅ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ✅ |

---

## Subscription Status

### Stored in Database
```typescript
users.currentPlan: "free" | "solo" | "team" | "enterprise"
users.subscriptionStatus: "active" | "inactive" | "cancelled" | "expired"
users.isSubscribed: boolean
```

### Active Subscription
- `currentPlan` is NOT "free"
- `subscriptionStatus` is "active"
- `isSubscribed` is true
- User paid for subscription

### Inactive Subscription
- Either `currentPlan` is "free"
- OR `subscriptionStatus` is not "active"
- OR `isSubscribed` is false
- No active payment

---

## Usage Examples

### Check Feature Access
```typescript
// In route handler
const result = await verifyFeatureAccess(userId, "teamManagement");
if (!result.allowed) {
  return res.status(403).json({ error: result.error });
}
```

### Check Usage Limit
```typescript
// In route handler
const limitCheck = await checkUsageLimit(req, "invoices", currentCount);
if (!limitCheck.allowed) {
  return res.status(403).json({
    error: limitCheck.error,
    remaining: limitCheck.remaining
  });
}
```

### Middleware Approach
```typescript
// Use middleware in route registration
app.post("/api/advanced", requirePlan("solo", "team", "enterprise"), handler);
app.post("/api/team-only", requirePlan("team", "enterprise"), handler);
```

### After Payment (in webhook handler)
```typescript
// After successful payment
await upgradeSubscription(userId, "solo", "active");
```

### On Cancellation
```typescript
// When user cancels
await cancelSubscription(userId);
// This sets: subscriptionStatus = "cancelled", isSubscribed = false
```

---

## Error Responses

### Feature Not Available
```json
{
  "success": false,
  "error": "Upgrade required",
  "message": "Feature 'teamManagement' not available on free plan",
  "upgradeRequired": true
}
```

### Limit Exceeded
```json
{
  "success": false,
  "error": "Invoice limit reached",
  "message": "invoices limit (3) reached on free plan",
  "remaining": 0,
  "upgradeRequired": true
}
```

### Insufficient Plan
```json
{
  "success": false,
  "error": "Plan upgrade required",
  "message": "This feature requires one of these plans: team, enterprise",
  "currentPlan": "solo",
  "upgradeRequired": true
}
```

---

## Implementation Checklist

✅ **Complete**:
- `subscriptionManager.ts` - Core subscription utilities
- `subscriptionMiddleware.ts` - Middleware and helpers
- Routes updated with subscription middleware
- Voice recording limit checks
- Invoice send limit checks
- Project creation limit checks

⏳ **Next** (Task 5):
- Flutterwave webhook handler to call `upgradeSubscription()`
- Update user plan after successful payment
- Handle subscription renewals

---

## Key Design Principles

### 1. Don't Trust Client
✅ Server fetches plan from database
❌ Never accept plan from client request

### 2. Consistent Errors
✅ All limit errors return 403 with `upgradeRequired: true`
❌ Inconsistent error messages confuse users

### 3. Quota Checking
✅ Check limits BEFORE allowing action
❌ Allow action, check quota after

### 4. Descriptive Messages
✅ "Invoice limit (3) reached on free plan"
❌ "Limit exceeded"

### 5. Upgrade Path
✅ Every limit error includes `upgradeRequired: true`
❌ User unsure how to fix

---

## Files Modified

- ✅ [server/utils/subscriptionManager.ts](server/utils/subscriptionManager.ts) - Created
- ✅ [server/utils/subscriptionMiddleware.ts](server/utils/subscriptionMiddleware.ts) - Created
- ✅ [server/routes.ts](server/routes.ts) - Added subscriptionMiddleware
- ✅ [server/transcription.ts](server/transcription.ts) - Added voice recording checks
- ✅ [server/invoices.ts](server/invoices.ts) - Added invoice limit checks
- ✅ [server/projects.ts](server/projects.ts) - Added project creation checks

---

## Next Task: Task 5 - Payment Webhook Handler

The payment webhook handler will:
1. Listen for Flutterwave payment success notifications
2. Verify webhook signature for security
3. Update user subscription with `upgradeSubscription(userId, newPlan)`
4. Send confirmation email
5. Handle idempotency (prevent duplicate upgrades)
6. Log all payment events for audit trail
