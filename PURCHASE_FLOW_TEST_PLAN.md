# Complete Purchase Flow Test Plan

**Goal:** Verify end-to-end subscription purchase, verification, and feature unlock

## Test Scenarios

### Test 1: Free User → Purchases Solo Plan

**Setup:**
- Launch app fresh (no previous subscription)
- User auto-defaults to "free" tier

**Steps:**
1. Open app → Navigate to BillingScreen
2. Verify pricing displays (should pull from RevenueCat offerings)
3. Tap "Upgrade Now" on Solo plan
4. Verify native iOS/Android payment UI opens
5. Use test payment method to complete purchase
6. Verify success alert shows "🎉 Upgraded to Solo! Your new plan: solo"
7. Close alert, navigate to MoneyAlertsScreen
8. Verify MoneyAlertsScreen shows money alerts (not locked anymore)

**Expected Results:**
- ✅ Payment UI opens (native, not browser)
- ✅ Purchase completes successfully
- ✅ Backend verifies with RevenueCat
- ✅ userEntitlement updates from "none" → "solo"
- ✅ Features unlock instantly
- ✅ moneyAlertsUsed counter now visible (if data exists)

---

### Test 2: Free User → Attempts Premium Feature

**Setup:**
- Free user (3 recordings used, 0 remaining)

**Steps:**
1. Open VoiceRecordingScreen
2. Verify remaining recordings shows "0 of 3 available"
3. Tap mic button to Record
4. Verify modal shows "You've reached your recording limit"
5. Tap "Upgrade to Solo" button
6. Navigate to BillingScreen
7. Purchase Solo plan
8. Return to VoiceRecordingScreen
9. Verify remaining recordings shows "Unlimited"

**Expected Results:**
- ✅ Limit enforced on free tier
- ✅ Upgrade modal shown
- ✅ Navigation to billing works
- ✅ Post-upgrade, unlimited access works
- ✅ No refresh needed

---

### Test 3: Solo User → Tries Scope Proof (Professional Feature)

**Setup:**
- User on Solo plan

**Steps:**
1. Navigate to ApprovalsScreen (Scope Proof)
2. Verify LockedFeatureOverlay shows with:
   - Title: "Approvals"
   - Subtitle: "Manage client approvals for extra work"
   - Button: "Upgrade to Professional"
3. Tap "Upgrade to Professional"
4. Purchase Professional plan ($24/month)
5. Return to ApprovalsScreen
6. Verify lock overlay disappears
7. Verify can now create scope proof request

**Expected Results:**
- ✅ Lock overlay shows on Solo user
- ✅ Navigation to billing works
- ✅ Post-upgrade, feature unlocks
- ✅ Can access all Professional features

---

### Test 4: Subscription Expiration

**Setup:**
- User has Professional subscription that's about to expire

**Trigger:**
- Backend webhook receives EXPIRATION event from RevenueCat

**Expected Results:**
- ✅ Database updates: subscriptionStatus = "expired"  
- ✅ Backend downgrade runs automatically
- ✅ Next `useEntitlementRefresh()` call fetches updated status
- ✅ App downgrade user to "free"
- ✅ Scope Proof screen locks again
- ✅ Upgrade prompt appears

---

### Test 5: Restore Purchases

**Setup:**
- User previously purchased Professional
- User reinstalled app (fresh start)

**Steps:**
1. Open BillingScreen
2. Tap "Restore Purchases" button
3. Verify spinner shows while restoring
4. Verify success alert: "✅ Purchases restored!"
5. Check subscriptionStore: userEntitlement should be "professional"
6. Navigate to ApprovalsScreen
7. Verify lock overlay is gone (user has access)

**Expected Results:**
- ✅ Purchases.restorePurchases() called
- ✅ Backend verifies previous purchases
- ✅ Entitlements restored
- ✅ Features available without re-purchasing
- ✅ Modal shows success

---

### Test 6: Annual Plan Savings

**Setup:**
- User on BillingScreen

**Steps:**
1. Toggle "Monthly" → Selected, price shows "$24/month"
2. Toggle "Annual" → Selected, price shows annual price
3. Calculate: Annual should be ~17% cheaper than monthly × 12
4. For Professional: $24 × 12 = $288, annual ≈ $240 (save $48)
5. Verify UI shows "Annual (Save 17%)"

**Expected Results:**
- ✅ Toggle works
- ✅ Prices update correctly
- ✅ Savings calculation correct
- ✅ RevenueCat annual packages available

---

## Backend Verification Flow

### API Endpoint Testing

**POST `/api/billing/verify-iap`**

Request:
```json
{
  "revenuecatCustomerInfo": {
    "originalAppUserId": "user_123",
    "entitlements": {
      "active": {
        "professional": { "isActive": true }
      }
    }
  }
}
```

Response:
```json
{
  "success": true,
  "plan": "professional",
  "status": "active",
  "expiresAt": "2026-03-20T...",
  "customerId": "revenuecat_id_..."
}
```

Verify:
- ✅ Endpoint returns correct plan
- ✅ Database updates user.currentPlan
- ✅ Logs show purchase verification
- ✅ Webhook notification received

---

**POST `/api/webhooks/revenuecat`**

Events to test:
- `INITIAL_PURCHASE` - Create/update subscription
- `RENEWAL` - Extend expiration date
- `CANCELLATION` - Mark as canceled
- `EXPIRATION` - Auto-downgrade to free

Verify for each:
- ✅ Webhook signature validates correctly
- ✅ Database updates correctly
- ✅ Subscription status reflects change
- ✅ No errors in server logs

---

## Test Environment Setup

### For Testing on Device/Simulator

**iOS (TestFlight):**
```bash
# 1. Archive and upload to TestFlight
xcode-select --install
cd ios
pod install
```

**Android (Play Console):**
```bash
# 1. Build and upload to internal testing channel
./gradlew bundleRelease
# Upload to Google Play Console > Internal Testing
```

### RevenueCat Test Configuration

**Test Products (iOS):**
- com.tellbill.solo_plan_monthly - $9.99/month (free trial)
- com.tellbill.professional_plan_monthly - $24.99/month
- com.tellbill.enterprise_plan_monthly - $99.99/month

**Test Products (Android):**
- solo_plan_monthly
- professional_plan_monthly
- enterprise_plan_monthly

**Test Payment Methods:**
- iOS: Use Sandbox Apple ID (Settings > App Store)
- Android: Use test account from Play Console

---

## Logging & Debugging

### Key Console Logs to Monitor

```
[RevenueCat] Customer info updated
[Entitlement] Refreshing subscription for user: ...
[Entitlement] ✅ Backend sync success
[VoiceRecording] Starting purchase
[VoiceRecording] ✅ Purchase successful
[Webhooks] Received INITIAL_PURCHASE event
[Subscriptions] Verified purchase and updated DB
```

### Common Issues & Resolution

| Issue | Cause | Resolution |
|-------|-------|-----------|
| "No pricing found" | RevenueCat offerings not loaded | Check API key, offerings config |
| Purchase dialog doesn't open | RevenueCat SDK not initialized | Check useRevenueCat hook called |
| Backend verification fails | JWT token missing | Check authToken stored correctly |
| Features don't unlock | useEntitlementRefresh not called | Verify hook in App.tsx |
| Webhook not received | RevenueCat webhook URL wrong | Update webhook URL in dashboard |
| Test purchases work, real don't | Sandbox vs production mismatch | Verify bundle IDs match |

---

## Sign-Off

- [ ] All 6 test scenarios pass
- [ ] No errors in console logs
- [ ] No TypeScript errors (npx tsc --noEmit)
- [ ] No runtime errors on iOS simulator
- [ ] No runtime errors on Android emulator
- [ ] Payments actually process (test transactions)
- [ ] Backend logs show successful verification
- [ ] Features unlock within 1-2 seconds of purchase
- [ ] Restore Purchases works for past purchases
- [ ] Ready for TestFlight/Play Console beta

---

**Next Step:** Execute these tests and document any issues found.
