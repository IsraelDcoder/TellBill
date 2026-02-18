# TellBill Production Launch Todo List

**Target Launch Date:** February 22-23, 2026 (4-5 days)  
**Goal:** Production-ready app with professional quality  
**Status:** 70% complete, 30% remaining


## 🔴 CRITICAL PATH (MUST COMPLETE BEFORE LAUNCH)

### 1. Payment Links in Invoices (4-6 hours) 🔥
**Priority:** CRITICAL  
**Why:** Users cannot pay without this. Core feature broken.  
**Impact:** Block users from converting to paid

- [ ] Create Stripe checkout session per invoice
- [ ] Generate unique payment link
- [ ] Add link to PDF invoice footer ("Pay Now" button)
- [ ] Add link to WhatsApp message template
- [ ] Add link to email template
- [ ] Listen for Stripe payment webhook
- [ ] Auto-update invoice status to "paid" when payment received
- [ ] Send payment confirmation email
- [ ] Test end-to-end: Create invoice → Send → Client pays → Status updates
- [ ] Test on iOS + Android
- [ ] **Estimated:** 4-6 hours
- [ ] **File:** server/invoices.ts, emailService.ts, client screens

**What Success Looks Like:**
```
Contractor creates invoice → Sends to client
Client receives WhatsApp: "Invoice: $1000. Pay now: [link]"
Client clicks link → Stripe checkout
Pays with card
Invoice status automatically changes to "paid"
Contractor app shows invoice as paid ✅
```

---

### 2. RevenueCat Frontend Integration (6-8 hours) ⏳
**Priority:** CRITICAL  
**Why:** Cannot process subscriptions without this. Required for App Store.  
**Impact:** Monetization doesn't work

#### Part 1: Install SDK & Setup (2 hours)
- [ ] Install RevenueCat Expo SDK
- [ ] Create RevenueCat config file
- [ ] Initialize RevenueCat on app launch (in app.tsx)
- [ ] Configure app user ID (link to TellBill user ID)
- [ ] Setup entitlements (Free, Solo, Professional, Enterprise)
- [ ] Create PurchasesProvider wrapper

#### Part 2: Implement Purchase Screen (2-3 hours)
- [ ] Create PricingScreen component
- [ ] Display 4 pricing tiers (Free, Solo, Pro, Enterprise)
- [ ] Show features per tier (bullets/comparison)
- [ ] Create "Upgrade Now" buttons
- [ ] Implement purchase flow
- [ ] Handle purchase errors
- [ ] Show loading state

#### Part 3: Entitlements Checking (1-2 hours)
- [ ] Check subscription status on app startup
- [ ] Hide Pro features if not subscribed
- [ ] Show "Upgrade Required" modal when accessing paid features
- [ ] Check entitlements before using features (voice recordings, etc.)
- [ ] Display user tier on ProfileScreen

#### Part 4: Testing (1 hour)
- [ ] Test on iOS simulator with TestFlight review
- [ ] Test on Android with Google Play Console review
- [ ] Test free tier restrictions
- [ ] Test upgrade flow
- [ ] Test restore purchases

**Estimated:** 6-8 hours total  
**Files to modify:**
- app.tsx (initialize RevenueCat)
- Create: components/PricingScreen.tsx
- Create: providers/PurchasesProvider.tsx
- Modify: Feature guards throughout app
- Modify: ProfileScreen.tsx (show subscription status)

**What Success Looks Like:**
```
User opens app → RevenueCat initializes
Free user tries Pro feature → Sees upsell modal
Clicks "Upgrade" → PricingScreen opens
Selects "Solo $12/month" → Triggers RevenueCat purchase
Pays with Apple ID / Google Play
Gets access to feature immediately
ProfileScreen shows "Solo subscriber (renews Mar 18)"
```

---

### 3. Data Persistence Todo Items (2-3 hours) 🔒
**Priority:** HIGH  
**Why:** User settings disappear after logout/reinstall - bad UX  
**Impact:** User frustration, churn

#### Settings Not Saved:
- [ ] **Currency setting** (Settings → Currency)
  - Save to `user.preferredCurrency` in database
  - Load on app startup
  - Apply to all invoice calculations
  - Files: SettingsScreen.tsx, ProfileScreen.tsx, server auth endpoint

- [ ] **Tax rate preference** (Settings → Tax Rate)
  - Save to `user.defaultTaxRate` in database
  - Apply when creating new invoices
  - Files: TaxSettingsScreen.tsx, invoices.ts POST endpoint

- [ ] **Invoice template preference** (Settings → Templates)
  - Save selected template to database
  - Load on invoice creation
  - Files: InvoiceTemplateScreen.tsx, invoiceStore.ts

- [ ] **Payment terms preference** (Settings → Payment Terms)
  - Save default payment terms to database
  - Pre-fill on new invoices
  - Files: SettingsScreen.tsx, POST /api/invoices

- [ ] **Profile edits** (Profile → Edit Profile)
  - Save company name, address, phone to database
  - Load on app startup
  - Files: EditProfileScreen.tsx, PATCH endpoint

**Implementation Pattern:**
```typescript
// On setting change:
const saveUserPreference = async (preferenceKey, value) => {
  // Save to database
  await updateUser({ [preferenceKey]: value });
  
  // Update local state
  setUserPreferences({ ...prefs, [preferenceKey]: value });
};

// On app startup:
const loadUserPreferences = async () => {
  const user = await fetchUser();
  setUserPreferences({
    currency: user.preferredCurrency,
    taxRate: user.defaultTaxRate,
    // etc
  });
};
```

**Estimated:** 2-3 hours (5-10 min per setting × 5 settings)  
**Impact:** Users don't lose settings after logout = better retention

---

### 4. API Security Hardening (3-4 hours) 🔐
**Priority:** HIGH  
**Why:** Production app gets attacked. Need protection.  
**Impact:** Prevents abuse, spam, data validation errors

- [ ] **Rate Limiting**
  - Install: express-rate-limit
  - Limit auth endpoints (5 requests/15 min)
  - Limit invoice creation (20/hour)
  - Limit API calls (100/hour per user)
  - Files: server/middleware/rateLimit.ts, server/routes.ts

- [ ] **Input Validation**
  - Validate all text fields (max length, sanitization)
  - Validate numbers (positive, reasonable ranges)
  - Validate emails, phone numbers
  - Validate UUID formats
  - Files: server/utils/validation.ts (expand existing)

- [ ] **CORS Configuration**
  - Review CORS settings (should be restrictive)
  - Only allow tellbill.app domain
  - Prevent cross-site attacks
  - Files: server/index.ts

- [ ] **Error Handling**
  - Don't expose database errors to users
  - Return generic "Something went wrong"
  - Log actual errors to Sentry
  - Files: server/utils/errorHandler.ts

- [ ] **Database Query Protection**
  - Verify user ownership before returning data
  - Don't leak other users' invoices
  - Validate ownership on PATCH/DELETE
  - Files: All /api endpoints

**Estimated:** 3-4 hours  
**Impact:** Production-level security

---

## 🟡 HIGH PRIORITY (Complete Before Week 1 Post-Launch)

### 5. Onboarding Flow (3-4 hours)
**Priority:** HIGH (but can come right after launch)  
**Why:** New users confused, don't know how to use app  
**Where:** Shown once after signup

- [ ] Create 5-7 onboarding screens
- [ ] Show: Create invoice → Send → Track payment flow
- [ ] Demo voice recording
- [ ] Demo PDF generation
- [ ] Show pricing/upgrade options
- [ ] Add skip button
- [ ] Track onboarding completion
- [ ] Don't show again if completed

**Estimated:** 3-4 hours

---

### 6. Analytics Setup (2-3 hours)
**Priority:** HIGH (needed to track launch success)  
**Why:** Need data to make decisions

- [ ] Setup Google Analytics 4
- [ ] Setup Sentry for error tracking
- [ ] Add custom events:
  - Invoice created
  - Invoice sent
  - Payment received
  - User upgraded
  - User churned
- [ ] Create monitoring dashboard
- [ ] Setup alerts for errors

**Estimated:** 2-3 hours

---

### 7. Scope Proof Auto-Invoicing (2-3 hours)
**Priority:** MEDIUM  
**Why:** Nice UX feature, not critical  
**Where:** After scope approved, auto-create invoice

- [ ] Add button "Create Invoice from Scope"
- [ ] Populate invoice items from scope photos
- [ ] Pre-fill client info
- [ ] Pre-fill job info
- [ ] Let user review before creating

**Estimated:** 2-3 hours

---

## 🟢 NICE-TO-HAVE (Post-Launch)

### 8. Advanced Features
- [ ] Apple/Google Sign-In
- [ ] Social sharing (share invoice link)
- [ ] Invoice scheduling
- [ ] Bulk operations
- [ ] Client portal
- [ ] QuickBooks integration
- [ ] Team management

---

## 📋 TESTING CHECKLIST (Must Complete Before Launch)

### Functional Testing
- [ ] Create invoice (all fields)
- [ ] Record voice invoice
- [ ] Generate PDF
- [ ] Send invoice (Email)
- [ ] Send invoice (WhatsApp)
- [ ] Mark invoice as paid
- [ ] Edit invoice
- [ ] Delete invoice
- [ ] Duplicate invoice

### User Flow Testing
- [ ] Signup flow end-to-end
- [ ] Email verification
- [ ] Login/logout
- [ ] Password reset
- [ ] Create invoice from voice recording
- [ ] Send to real email/WhatsApp
- [ ] Receive payment
- [ ] Check revenue updated

### Device Testing
- [ ] iPhone 12+ (iOS 16+)
- [ ] Android 10+ (Pixel, Samsung)
- [ ] Tablet responsiveness
- [ ] Landscape mode

### Edge Cases
- [ ] Low network (slow internet)
- [ ] Offline mode (cache)
- [ ] Network timeout
- [ ] Large file upload (PDF)
- [ ] Concurrent invoices
- [ ] Session expiry
- [ ] Token refresh

### Performance
- [ ] App load time < 3 seconds
- [ ] Invoice creation < 2 seconds
- [ ] PDF generation < 5 seconds
- [ ] Search/filter responsive

### Security
- [ ] Can't access other users' invoices
- [ ] JWT token properly validated
- [ ] Passwords hashed (not visible in DB)
- [ ] Rate limiting works
- [ ] CORS properly configured

---

## 🚀 LAUNCH WEEK SCHEDULE

### Day 1 (February 19): Payment Links + Revenue Cat
- [ ] Morning: Payment links in invoices (4 hours)
- [ ] Afternoon: RevenueCat SDK install (2 hours)
- [ ] Evening: Test both

### Day 2 (February 20): Revenue Cat Frontend
- [ ] Morning: Build PricingScreen (2 hours)
- [ ] Afternoon: Entitlements checking (2 hours)
- [ ] Evening: Full purchase flow testing

### Day 3 (February 21): Data Persistence + Security
- [ ] Morning: Settings persistence (2 hours)
- [ ] Afternoon: API security hardening (3 hours)
- [ ] Evening: Security testing

### Day 4 (February 22): Testing + Bug Fixes
- [ ] Full testing suite
- [ ] Bug fixes from testing
- [ ] Performance optimization
- [ ] Final polish

### Day 5 (February 23): Launch
- [ ] ProductHunt launch (morning)
- [ ] Social media blitz
- [ ] Monitor for issues
- [ ] Respond to feedback

---

## 📊 COMPLETION TRACKING

```
CRITICAL PATH (Must finish):
✅ Invoice PDF fixed (done)
✅ Persistence layer complete (done)
✅ Scrolling fixed (done)
✅ TypeScript clean (done)
⏳ Payment links in invoices (4-6 hours) - START HERE
⏳ RevenueCat frontend (6-8 hours)
⏳ Data persistence todos (2-3 hours)
⏳ API security (3-4 hours)

Total critical path time: 15-21 hours
At 5 hours/day: 3-4 days work

HIGH PRIORITY (First week):
⏳ Onboarding flow (3-4 hours)
⏳ Analytics (2-3 hours)
⏳ Scope auto-invoicing (2-3 hours)

Total: 7-10 hours (1-2 days work)
```

---

## 🎯 SUCCESS CRITERIA FOR LAUNCH

```
✅ Can create invoice from voice recording
✅ Can send invoice to client
✅ Client can pay via link
✅ Invoice status updates to "paid"
✅ Revenue shows correctly
✅ User tier shows correctly
✅ Can't access paid features without subscription
✅ Settings persist after logout
✅ No TypeScript errors
✅ No runtime errors
✅ App doesn't crash on any screen
✅ Data secure (can't access other users' data)
✅ Rate limiting prevents abuse
✅ Performance acceptable (<3s load time)
```

---

## 📝 Notes

- **Your uncle conversation:** Shows this list. Proves you know what's needed. Professional.
- **Time estimate:** 15-21 hours of coding = 3-4 days at 5 hours/day
- **Energy management:** Split work into 2-hour chunks, take breaks
- **Testing:** Do functional testing as you build, not at the end
- **Backup:** Commit to git after each major feature (payment links, revenue cat SDK, etc.)
- **Deploy:** After each critical feature is done, deploy to Render (auto-deploys)

