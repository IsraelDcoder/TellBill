# 🚨 TellBill - PLAN GATING IMPLEMENTATION

## Overview

**TellBill** uses a 4-tier subscription model with strict backend plan enforcement:

- `free` - Trial only ($0)
- `solo` - Get organized ($29/month)
- `professional` - Protect revenue ($79/month) ⭐ ANCHOR
- `enterprise` - Revenue infrastructure ($299/month)

**Golden Rule**: Backend always enforces. Frontend prevents UX access only.

---

## Architecture

### 1. Centralized Capability Matrix
**File**: `server/utils/planCapabilities.ts`

```typescript
export const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
  free: {
    voiceRecordingsMonthly: 3,
    invoicesMonthly: 3,
    projectManagement: false,
    scopeProof: false,
    // ... other features
  },
  professional: {
    voiceRecordingsMonthly: Infinity,
    invoicesMonthly: Infinity,
    projectManagement: true,
    scopeProof: true,  // ✅ ANCHOR FEATURE
    // ... other features
  },
  // ...
}
```

**This is the source of truth.** All gating logic references this file.

---

### 2. Subscription Middleware
**File**: `server/utils/subscriptionGuard.ts`

Applied globally to all authenticated routes:

```typescript
app.use("/api/...", authMiddleware, attachSubscriptionMiddleware);
```

**What it does**:
- Fetches user's `currentPlan` from database
- Attaches `req.subscription` with plan info
- Available to all downstream route handlers

---

### 3. Plan Guards
**File**: `server/utils/subscriptionGuard.ts`

Three guard functions:

#### `requirePaidPlan()`
Blocks free tier from accessing feature.
```typescript
app.post("/api/projects/create", requirePaidPlan, createProject);
// Free users: 403 Forbidden
// Solo+: Allowed
```

#### `requirePlan(...plans)`
Requires specific tier(s).
```typescript
app.post("/api/scope-proof", 
  requirePlan("professional", "enterprise"), 
  createScopeProof
);
// Free/Solo: 403 with required_plan: "professional"
// Professional/Enterprise: Allowed
```

#### `checkUsageLimit(metric, limits)`
Enforces metered limits (free tier).
```typescript
app.post("/api/transcribe",
  checkUsageLimit("voiceRecordings", {
    free: 3,
    solo: Infinity,
    professional: Infinity,
    enterprise: Infinity
  }),
  transcribe
);
```

---

## Feature Gating Rules

### By Feature

| Feature | Free | Solo | Professional | Enterprise |
|---------|------|------|--------------|-----------|
| Voice Recording | ✅ (3/mo) | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| Invoice Creation | ✅ (3/mo) | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| Projects | ❌ | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| Receipt Scanning | ❌ | ✅ | ✅ | ✅ |
| **Scope Proof** | ❌ | ❌ | ✅ | ✅ |
| **Client Approvals** | ❌ | ❌ | ✅ | ✅ |
| Photo Proof | ❌ | ❌ | ✅ | ✅ |
| Approval Reminders | ❌ | ❌ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| Custom Branding | ❌ | ❌ | ❌ | ✅ |
| Dedicated Support | ❌ | ❌ | ❌ | ✅ |

---

## Protected Routes

### Scope Proof (Professional+)

```typescript
app.get("/api/scope-proof", 
  requirePlan("professional", "enterprise"), ...)
app.post("/api/scope-proof", 
  requirePlan("professional", "enterprise"), ...)
app.post("/api/scope-proof/:id/request", 
  requirePlan("professional", "enterprise"), ...)
app.post("/api/scope-proof/:id/resend", 
  requirePlan("professional", "enterprise"), ...)
app.delete("/api/scope-proof/:id", 
  requirePlan("professional", "enterprise"), ...)
```

**Response (Solo/Free user)**:
```json
{
  "error": "Upgrade required",
  "code": "INSUFFICIENT_PLAN",
  "current_plan": "solo",
  "required_plan": "professional",
  "message": "This feature requires professional plan or higher"
}
```

---

### Projects (Solo+)

```typescript
app.post("/api/projects", requirePaidPlan, ...)
app.get("/api/projects", requirePaidPlan, ...)
```

---

### Receipt Scanning (Solo+)

```typescript
app.post("/api/receipts/scan", requirePaidPlan, ...)
```

---

### Transcription (All plans, metered for free)

```typescript
app.post("/api/transcribe", 
  checkUsageLimit("voiceRecordings", {
    free: 3,
    solo: Infinity,
    professional: Infinity,
    enterprise: Infinity
  }), 
  transcribeAudio
);
```

---

## Payment Flow → Unlock

When Flutterwave webhook confirms payment:

1. **Webhook received**: `POST /api/payments/webhook`
2. **Verify payment** with Flutterwave API
3. **Update user record**:
   ```sql
   UPDATE users 
   SET currentPlan = 'professional', 
       isSubscribed = true,
       subscriptionStatus = 'active'
   WHERE id = $userId
   ```
4. **Next API call** uses new plan
5. **Frontend refreshes subscription** from `/api/me`
6. **Features unlock immediately**

**No delays. No caching. Backend is source of truth.**

---

## Frontend Integration

### 1. Check User Plan
```typescript
// From auth context or /api/me endpoint
const userPlan = authContext.user.currentPlan; // "professional"
```

### 2. Determine Access
```typescript
import { PLAN_CAPABILITIES, hasCapability } from "@/constants/planCapabilities";

const canUseScopeProof = hasCapability(userPlan, "scope_proof");
// Returns: true if professional/enterprise
```

### 3. Lock UI
```typescript
{canUseScopeProof ? (
  <ApprovalsScreen />
) : (
  <LockedFeatureOverlay
    feature="Scope Proof"
    requiredPlan="professional"
    onUpgradePress={handleUpgrade}
  />
)}
```

### 4. After Payment
```typescript
// Payment success screen
setTimeout(async () => {
  // Refresh auth context
  const updatedUser = await fetch("/api/me").then(r => r.json());
  setAuthUser(updatedUser);
  
  // Re-render with new plan
  navigation.reset(...);
}, 2000);
```

---

## Security Guarantees

✅ **Backend enforcement**: No client-side bypass possible  
✅ **No caching issues**: Plan checked on every request  
✅ **Immediate unlock**: Payment → DB update → API call sees new plan  
✅ **Audit trail**: All denials logged (plan + timestamp)  
✅ **Downgrade protection**: Features re-lock if user downgrades  

---

## Testing Checklist

### Free Tier
- [ ] Can create account (free plan auto-assigned)
- [ ] Can record 3 voice messages
- [ ] 4th recording: 403 "Limit reached"
- [ ] Can create 3 invoices
- [ ] 4th invoice: 403 "Limit reached"
- [ ] Cannot access projects: 403 "Upgrade required"
- [ ] Cannot access scope proof: 403 "Upgrade required"

### Upgrade to Solo
- [ ] Process payment ($29)
- [ ] Webhook updates `currentPlan = "solo"`
- [ ] Projects feature unlocks
- [ ] Receipt scanning unlocks
- [ ] Scope Proof still locked: 403
- [ ] Can create unlimited recordings/invoices

### Upgrade to Professional
- [ ] Process payment ($79)
- [ ] Webhook updates `currentPlan = "professional"`
- [ ] All Solo features work
- [ ] Scope Proof endpoint returns 200 (not 403)
- [ ] Can create scope proof
- [ ] Can request client approval
- [ ] Can see approvals screen

### Downgrade (Manual DB for testing)
- [ ] Set `currentPlan = "solo"`
- [ ] Scope Proof endpoint: 403
- [ ] Cannot see approvals screen

---

## Error Responses

### Feature Not Available for Plan
```json
{
  "error": "Upgrade required",
  "code": "INSUFFICIENT_PLAN",
  "current_plan": "free",
  "required_plan": "solo",
  "message": "This feature requires solo plan or higher"
}
```
**HTTP**: 403 Forbidden

### Usage Limit Exceeded
```json
{
  "error": "Limit reached",
  "code": "USAGE_LIMIT_EXCEEDED",
  "current_plan": "free",
  "metric": "voiceRecordings",
  "used": 3,
  "limit": 3,
  "upgrade_required": true,
  "required_plan": "solo"
}
```
**HTTP**: 403 Forbidden

---

## File Structure

```
server/
├── utils/
│   ├── planCapabilities.ts      ← Capability matrix (SOURCE OF TRUTH)
│   ├── subscriptionGuard.ts     ← Middleware + guards
│   └── authMiddleware.ts        ← JWT auth
├── scopeProof.ts                ← Protected routes (/api/scope-proof)
├── projects.ts                  ← Protected routes (/api/projects)
├── invoices.ts                  ← Protected routes (/api/invoices)
└── routes.ts                    ← Middleware registration

client/
├── hooks/
│   └── useFeatureLock.ts        ← Frontend plan check
├── stores/
│   └── subscriptionStore.ts     ← Plan state (Zustand)
├── components/
│   ├── LockedFeatureOverlay.tsx ← Lock UI
│   └── UpgradeRequiredModal.tsx ← Upgrade CTA
└── screens/
    ├── BillingScreen.tsx        ← Pricing display
    └── ApprovalsScreen.tsx      ← Scope Proof (locked)
```

---

## Key Takeaways

1. **One source of truth**: `planCapabilities.ts`
2. **Global middleware**: Every API request knows the user's plan
3. **Immediate gating**: No delays, no caching
4. **Backend enforcement**: Frontend is UX only
5. **Clear errors**: Users see required plan, not generic 403
6. **Testable**: Each feature has explicit access rules

This is revenue protection. Implement it carefully.
