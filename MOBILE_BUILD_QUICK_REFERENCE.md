# 🎯 MOBILE UI BUILD - COMPLETE ✅ 
## Quick Reference For Final Integration

---

## 📱 WHAT WAS BUILT TODAY

### 1. Referral Screen (ReferralScreen.tsx)
- **Path**: `c:\TellBill\client\screens\ReferralScreen.tsx`
- **Features**:
  - Display referral code with big font (8 chars)
  - Copy to Clipboard button
  - Share button (native dialog)
  - Progress meter (0-3 referrals)
  - Bonus card (earned/redeemed state)
  - Redeem bonus button
  - How-it-works guide

### 2. Template Picker (TemplatePickerScreen.tsx)
- **Path**: `c:\TellBill\client\screens\TemplatePickerScreen.tsx`
- **Features**:
  - Grid of 5 templates with color preview
  - Modern Minimal, Bold Industrial, Blue Corporate, Clean White Pro, Dark Premium
  - "Use This Template" button per template
  - Info card explaining customization

### 3. Intercom Hook (useIntercom.ts)
- **Path**: `c:\TellBill\client\hooks\useIntercom.ts`
- **Features**:
  - Loads Intercom messenger script
  - Authenticates with secure token
  - Shows chat widget on bottom right
  - Event tracking helper functions

### 4. Navigation Added
- **Path**: `c:\TellBill\client\navigation\ProfileStackNavigator.tsx`
- New screens: ReferralScreen, TemplatePickerScreen

### 5. Menu Items in Profile
- **Path**: `c:\TellBill\client\screens\ProfileScreen.tsx`
- Menu item: "Referral Program" (badge: "Earn Free")
- Menu item: "Invoice Templates" (badge: "Pro")

### 6. App Integration
- **Path**: `c:\TellBill\client\App.tsx`
- Added `useIntercomInitialization()` hook call

---

## ⏳ REMAINING WORK (2-3 HOURS)

### TASK 1: Capture Referral Code in Signup 
**File**: `c:\TellBill\client\screens\AuthenticationScreen.tsx`

**Around line 187-230 in handleSignUp function, add after signup succeeds**:
```typescript
// After: await signUp(signupEmail, password, fullName);
// Add:
if (referralCode) {
  try {
    const response = await fetch(`${getApiUrl()}/api/referral/signup-with-code`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ referral_code: referralCode }),
    });
    if (response.ok) {
      console.log("[Auth] Referral tracked successfully");
    }
  } catch (error) {
    console.error("[Auth] Referral tracking error:", error);
    // Don't fail signup if referral tracking fails
  }
}
```

**Also add referral code extraction** (near top of component):
```typescript
// Extract ?ref parameter from props or useRoute
const route = useRoute();
const referralCode = route?.params?.ref || null;
```

---

### TASK 2: Update RevenueCat Webhook
**File**: `c:\TellBill\server\billing\revenuecatWebhook.ts`

**After successful payment, add** (around payment success block):
```typescript
// After confirming subscription status is "active"
try {
  // Find referral that matches this user
  const referralConversions = await db
    .select()
    .from(referralConversions)
    .where(eq(referralConversions.referredUserId, userId))
    .limit(1);

  if (referralConversions.length > 0) {
    // Mark as converted
    await fetch(`${getApiUrl()}/api/referral/mark-converted`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverToken}`, // Use server auth
      },
      body: JSON.stringify({
        referralId: referralConversions[0].id,
      }),
    });
    console.log("[RevenueCatWebhook] Referral marked as converted");
  }
} catch (error) {
  console.error("[RevenueCatWebhook] Referral update error:", error);
  // Don't fail webhook if referral update fails
}
```

---

### TASK 3: Add Environment Variables
**File**: `.env`

**Add these lines**:
```bash
# Intercom Integration (get from https://www.intercom.com)
INTERCOM_APP_ID=your_app_id_here
INTERCOM_SECRET_KEY=your_webhook_secret_key
INTERCOM_ACCESS_TOKEN=your_api_access_token
```

**How to get them**:
1. Sign up at intercom.com
2. Create workspace for TellBill
3. Settings → Installation code → Copy App ID to INTERCOM_APP_ID
4. Settings → API access → Generate token → copy to INTERCOM_ACCESS_TOKEN
5. Settings → Webhooks → Signing Secret → copy to INTERCOM_SECRET_KEY

---

## 🧪 QUICK TEST CHECKLIST

### Referral Screen
- [ ] Tap "Referral Program" in Profile → ReferralScreen loads
- [ ] Copy button works (toast shows "Copied")
- [ ] Share button opens native dialog
- [ ] Progress shows 0/3
- [ ] Bonus card shows "Not earned yet"

### Template Picker  
- [ ] Tap "Invoice Templates" in Profile → TemplatePickerScreen loads
- [ ] See 5 templates with distinct colors
- [ ] Tap one → "Use This Template" button appears
- [ ] Click button → API called, success alert shown

### Intercom (if env vars set)
- [ ] After login, see chat widget (bottom right)
- [ ] Click widget → message composer opens
- [ ] Send message → appears in Intercom dashboard

### Referral Flow (End-to-End)
1. User A: Taps "Referral Program" → Gets code "ABC1D2E3"
2. User A: Taps Share → Sends link with ?ref=ABC1D2E3
3. User B: Clicks link → Sign up with ?ref=ABC1D2E3
4. User B: Completes signup → Backend calls `/api/referral/signup-with-code` ✓
5. User B: Pays for subscription → Backend calls `/api/referral/mark-converted` ✓
6. User A: Taps "Referral Program" → Shows "1/3 converted"
7. [Repeat for 2 more users]
8. User A: Shows "3/3 ✓ EARNED!" and "Claim Bonus" button ✓

---

## 🔗 BACKEND ENDPOINTS (Already Built)

All these are READY and tested:

**Referral**:
```
GET  /api/referral/my-code
POST /api/referral/signup-with-code
POST /api/referral/mark-converted
GET  /api/referral/stats
POST /api/referral/redeem-bonus
```

**Templates**:
```
GET  /api/templates/library/all
POST /api/templates/library/select
GET  /api/templates
POST /api/templates
PUT  /api/templates/:id/set-default
```

**Intercom**:
```
GET  /api/intercom/config
GET  /api/intercom/auth-token
POST /api/intercom/track-event
POST /api/intercom/webhook
```

---

## 📊 METRICS TO TRACK

After launching, monitor:
- Referral code sharing rate (% who tap share)
- Referral conversion rate (% from ?ref codes who pay)
- Template selection rate (which 5 are most popular)
- Chat widget interaction rate (% who open chat)
- Bonus redemption rate (% who claim earned bonuses)

---

## 🚀 DEPLOYMENT ORDER

1. **Test locally**: Verify all 3 remaining tasks work
2. **Update AuthenticationScreen** (capture ?ref)
3. **Update RevenueCat webhook** (mark-converted call)
4. **Add .env variables** (Intercom config)
5. **Deploy backend** with referral/template/intercom routes
6. **Deploy mobile** with new screens
7. **Test E2E** with real signup → payment flow
8. **Launch!**

---

## 💡 KEY NOTES

- If Intercom env vars not set, app works fine (just no chat widget)
- If referral tracking fails, signup/payment still succeed (best effort)
- Copy code is instant, Share opens native dialog (iOS/Android specific)
- Template picker calls backend immediately on select (not to invoice creation yet)
- All APIs return proper error messages for debugging

---

**Status**: ✅ Mobile UI 100% Complete  
**Time to finish**: ~2-3 hours for remaining integration  
**Files ready for review**: 3 new screens + 1 hook updated

