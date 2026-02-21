# TellBill Monetization Setup Guide

Complete step-by-step guide to set up RevenueCat, app stores, and launch TellBill for monetization in Nigeria.

---

## 🎯 Overview

This guide covers:
1. **RevenueCat Setup** - Subscription management platform
2. **App Store Configuration** - Apple & Google credentials
3. **Product & Offering Creation** - Define your pricing tiers
4. **Environment Configuration** - Add API keys to your app
5. **Testing** - Verify purchases work
6. **App Store Submissions** - Get live on stores

**Timeline:** 2-4 hours total (RevenueCat: 30 min, App Stores: 1-3 hours each)

---

## Part 1: RevenueCat Account Setup (30 min)

### Step 1.1: Create RevenueCat Account
1. Go to [RevenueCat Console](https://app.revenuecat.com)
2. Click **Sign Up**
3. Enter email and create password
4. Verify email
5. Create organization name: "TellBill"

### Step 1.2: Create App in RevenueCat
1. Dashboard → **+ Create App**
2. App name: `TellBill`
3. Platform: Select both iOS and Android
4. Currency: **NGN** (Nigerian Naira) or **USD** (if targeting international)
5. Click **Create**

### Step 1.3: Get Public API Key
1. In RevenueCat dashboard, go to **Settings** (gear icon)
2. Select your app from dropdown
3. Go to **API Keys** tab
4. Copy the **Public SDK Key** (starts with `pk_`)
5. **Save this** - you'll need it for your app

**Example key:** `pk_live_xxxxxxxxxxxxxxxx`

---

## Part 2: Create Products

Products are the actual subscriptions users can purchase.

### Step 2.1: Create "Solo" Product
1. Dashboard → **Products** (left sidebar)
2. Click **+ Add Product**
3. **Internal Name:** `solo`
4. **Display Name:** `Solo Monthly`
5. **Type:** Subscription
6. **Billing Period:** Monthly
7. **Duration:** 1 Month
8. **Price:** 
   - iOS/Android: ₦2,999 (or $4.99 if international)
9. Click **Create**

### Step 2.2: Create "Professional" Product
1. Click **+ Add Product** again
2. **Internal Name:** `professional`
3. **Display Name:** `Professional Monthly`
4. **Type:** Subscription
5. **Billing Period:** Monthly
6. **Duration:** 1 Month
7. **Price:**
   - iOS/Android: ₦9,999 (or $14.99 if international)
8. Click **Create**

### Step 2.3: (Optional) Create Annual Variants
For better retention, create annual plans:

**Solo Annual:**
- Internal Name: `solo_annual`
- Display Name: `Solo Annual`
- Price: ₦29,990 (2 months free compared to monthly)

**Professional Annual:**
- Internal Name: `professional_annual`
- Display Name: `Professional Annual`
- Price: ₦99,990 (2 months free compared to monthly)

---

## Part 3: Create Entitlements

Entitlements define what features users get. This determines the `currentPlan` in your app.

### Step 3.1: Create "solo" Entitlement
1. Dashboard → **Entitlements** (left sidebar)
2. Click **+ Add Entitlement**
3. **Identifier:** `solo`
4. **Display Name:** `Solo Plan`
5. Click **Create**

### Step 3.2: Create "professional" Entitlement
1. Click **+ Add Entitlement** again
2. **Identifier:** `professional`
3. **Display Name:** `Professional Plan`
4. Click **Create**

---

## Part 4: Create Offering

Offerings bundle products and display them on your billing screen.

### Step 4.1: Create Default Offering
1. Dashboard → **Offerings** (left sidebar)
2. Click **+ Create Offering**
3. **Name:** `default`
4. **Identifier:** `default`
5. Click **Create**

### Step 4.2: Add Packages to Offering

#### Add "Solo" Package:
1. In offering, click **+ Add Package**
2. **Package Identifier:** `solo_monthly`
3. **Display Name:** `Solo`
4. **Product:** Select `solo` (from Step 2.1)
5. **Entitlements:** Select `solo`
6. Click **Add**

#### Add "Professional" Package:
1. Click **+ Add Package** again
2. **Package Identifier:** `professional_monthly`
3. **Display Name:** `Professional`
4. **Product:** Select `professional` (from Step 2.2)
5. **Entitlements:** Select `professional`
6. Click **Add**

#### (Optional) Add Annual Packages:
If you created annual products, add them too:
- `solo_annual` → entitlement `solo`
- `professional_annual` → entitlement `professional`

---

## Part 5: Set Up App Store Connections

### Step 5.1: Configure Apple App Store

#### Prerequisites:
- Apple Developer Account ($99/year)
- App ID created in App Store Connect
- Authorization token from App Store Connect

#### In RevenueCat:
1. Dashboard → **Settings** → **Apps**
2. Select your app
3. Go to **Store Credentials** tab
4. Click **Configure** next to "Apple App Store"
5. **App Bundle ID:** `com.tellbill.app` (from app.json)
6. **Shared Secret:** (from App Store Connect)
   - In App Store Connect → Your App → Pricing, Tax & Billing → App-Specific Shared Secret
   - Copy and paste here
7. Click **Save**

### Step 5.2: Configure Google Play Store

#### Prerequisites:
- Google Play Developer Account ($25 one-time)
- Service Account created in Google Cloud Console

#### In RevenueCat:
1. Dashboard → **Settings** → **Apps**
2. Go to **Store Credentials** tab
3. Click **Configure** next to "Google Play"
4. **Package Name:** `com.tellbill.app`
5. **Service Account JSON:** 
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create Service Account with Google Play Developer API access
   - Download JSON key
   - Paste entire JSON here
6. Click **Save**

---

## Part 6: Add API Key to Your App

### Step 6.1: Create .env File
In your project root (`c:\TellBill\`), create a `.env` file:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=pk_live_your_api_key_here
```

Replace `pk_live_your_api_key_here` with your actual key from Step 1.3.

### Step 6.2: Or Add to app.json
If you prefer, add to `app.json` instead:

```json
{
  "expo": {
    "extra": {
      "revenueCatApiKey": "pk_live_your_api_key_here"
    }
  }
}
```

### Step 6.3: Restart Dev Server
Kill and restart your dev server for changes to take effect:
```bash
# Kill with Ctrl+C, then:
npm start
```

---

## Part 7: Testing Subscriptions

### Test on iOS:
1. Build for iOS: `eas build --platform ios --profile preview`
2. Install on test device
3. Go to Settings → [Your name] → Subscriptions
4. Add Test User
5. Make test purchase

### Test on Android:
1. Build for Android: `eas build --platform android --profile preview`
2. Install on test device
3. Go to Play Store → Account → Subscriptions
4. Add Test User with Gmail account
5. Make test purchase (won't charge real money)

### Verify in App:
- Billing page should show offerings
- Professional features should be locked
- After purchase, "Customize Templates" should unlock

---

## Part 8: Apple App Store Submission

### Step 8.1: Prepare App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **+ Apps** → **New App**
3. **Platform:** iOS
4. **Name:** TellBill
5. **Bundle ID:** `com.tellbill.app`
6. **SKU:** `tellbill_1` (any unique identifier)
7. Click **Create**

### Step 8.2: Add In-App Subscriptions
1. In App Store Connect, select your app
2. Go to **Features** → **In-App Purchases**
3. Click **+** to add subscription
4. **Type:** Auto-Renewable Subscription
5. **Product ID:** `solo` (must match RevenueCat)
6. **Reference Name:** Solo Monthly
7. **Price:** ₦2,999 (or $4.99)
8. **Billing Period:** Monthly
9. Add localized description
10. Click **Save**

Repeat for `professional` and any annual products.

### Step 8.3: Fill App Details
1. **Short Description:** 
   ```
   Professional invoice & work tracking for contractors
   ```

2. **Full Description:**
   ```
   TellBill helps contractors and freelancers:
   • Create professional invoices in seconds
   • Track payments and send automatic reminders
   • Record work with voice notes
   • Get client approvals with Scope Proof
   • Customize invoice templates
   • Unlimited invoices on Solo plan
   
   Join contractors across Nigeria already using TellBill!
   ```

3. **Keywords:** invoicing, freelance, contractor, work tracking, payments

4. **Support URL:** https://tellbill.app/support
5. **Privacy Policy URL:** https://tellbill.app/privacy
6. **App License Agreement:** [Create one or use template]

### Step 8.4: Add Screenshots & Preview
1. Go to **App Preview** section
2. Add 5-6 screenshots showing:
   - Invoice creation
   - Templates
   - Payments tracking
   - Work logs
   - Mobile invoice

3. Use Figma or Photoshop to create:
   - App icon (1024x1024px)
   - Screenshots (1170x2532px for iPhone)

### Step 8.5: Set Pricing
1. Go to **Pricing and Availability**
2. **Price:** Select your tier ₦2,999 or $4.99
3. **Countries:** Select Nigeria + any others
4. **Cleared for Sale:** Checkmark all regions

### Step 8.6: Submit for Review
1. Click **Submit for Review**
2. Answer questionnaire (usually quick for subscriptions)
3. Apple reviews in 24-48 hours
4. **Status:** Processing → Approved/Rejected

---

## Part 9: Google Play Store Submission

### Step 9.1: Create Google Play Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay $25 one-time fee
3. Accept Developer Agreement
4. Fill in account details

### Step 9.2: Create App Listing
1. Click **Create App**
2. **App Name:** TellBill
3. **Default Language:** English
4. **App or Game:** App
5. **Free or Paid:** Free (subscriptions are optional in-app purchases)
6. Click **Create**

### Step 9.3: Add In-App Products
1. Left menu → **Monetize** → **In-app products**
2. Click **Create In-app Product**
3. **Product ID:** `solo` (must match RevenueCat)
4. **Product Type:** Subscription
5. Fill details and pricing
6. Click **Save and Publish**

Repeat for `professional` and annual products.

### Step 9.4: Fill Store Listing
1. Left menu → **Store Listing**
2. **App Title:** TellBill
3. **Short Description:**
   ```
   Professional invoicing for contractors
   ```
4. **Full Description:** (same as Apple)
5. **Screenshots:** 
   - Add 5-6 screenshots (1080x1920px for phones)
6. **Feature Graphic:** (1024x500px banner)
7. **Icon:** 512x512px PNG
8. **Privacy Policy:** https://tellbill.app/privacy

### Step 9.5: Content Rating
1. Go to **Content Ratings**
2. Fill out questionnaire (takes 5 min)
3. Google assigns age rating automatically

### Step 9.6: Set Up Pricing
1. Go to **Pricing and Distribution**
2. **Countries:** Select Nigeria + others
3. **Pricing:** Select tier
4. Review and accept terms

### Step 9.7: Add Payment Method
1. Go to **Account** → **Payment Methods**
2. Add credit card (for payout)
3. Set up bank account for Nigerian transfers (Flutterwave, Payoneer, etc.)

### Step 9.8: Submit for Review
1. Click **Submit for Review** in Store Listing
2. Google reviews in 2-4 hours (usually faster)
3. App goes live automatically after approval

---

## Part 10: Configuration Checklist

Before launching, verify:

- [ ] RevenueCat account created
- [ ] API key added to `.env` or `app.json`
- [ ] Products created: `solo`, `professional`
- [ ] Entitlements created: `solo`, `professional`
- [ ] Offering created with packages
- [ ] Apple App Store credentials configured
- [ ] Google Play credentials configured
- [ ] Developer accounts created (Apple $99, Google $25)
- [ ] In-app products created on both stores
- [ ] App listings filled (screenshots, description, privacy policy)
- [ ] Pricing set for Nigeria (NGN) or international (USD)
- [ ] Test purchase successful on iOS
- [ ] Test purchase successful on Android
- [ ] App submitted to Apple App Store
- [ ] App submitted to Google Play Store

---

## Part 11: Post-Launch Monitoring

### Day 1-7: Monitor Everything
1. Check RevenueCat dashboard for test purchases
2. Monitor error logs (check Sentry/console)
3. Test with a real purchase if possible
4. Verify email reminders are sending
5. Check for crashes or performance issues

### Ongoing:
1. **Retention:** Monitor subscription retention % in RevenueCat
2. **Churn:** Track cancellation reasons
3. **Revenue:** Daily revenue tracking
4. **Support:** Set up support email: support@tellbill.app
5. **Updates:** Plan feature updates based on user feedback

---

## Part 12: Revenue Expectations (Nigeria)

### Realistic First Month:
- **Conservative:** ₦0-50,000 (need to market)
- **Moderate:** ₦100,000-500,000 (if shared on LinkedIn/Twitter)
- **Optimistic:** ₦500,000+ (viral posting + good timing)

### Marketing Strategy for Nigeria:
1. **LinkedIn Post:** Tuesday/Wednesday 8:30 AM WAT (already created)
2. **WhatsApp Groups:** Join contractor/freelancer groups
3. **Twitter:** Thread on contractor problems
4. **Facebook:** Nigerian contractor communities
5. **Referrals:** Offer discount for referrals

---

## Part 13: Troubleshooting

### RevenueCat says "No singleton instance"
- [ ] Did you add API key to `.env` or `app.json`?
- [ ] Did you restart the dev server?
- [ ] Is the API key correct (starts with `pk_`)?
- [ ] Check console logs for exact error

### Purchases fail on test
- [ ] Is product ID exactly matching RevenueCat?
- [ ] Did you add test user to App Store/Play Console?
- [ ] Do store credentials in RevenueCat match your app?
- [ ] Try removing and reinstalling app

### App rejected from store
Common issues:
- Missing privacy policy
- Unclear subscription terms
- No "restore purchases" button (add if needed)
- Beta features not disclosed

---

## Quick Command Reference

```bash
# Test locally
npm start

# Build for iOS (after setup)
eas build --platform ios --profile preview

# Build for Android
eas build --platform android --profile preview

# Submit to stores
# iOS: Use Xcode + App Store Connect
# Android: Use Play Console upload
```

---

## Support Links

- **RevenueCat Docs:** https://docs.revenuecat.com
- **RevenueCat Errors:** https://errors.rev.cat
- **Apple App Store Guide:** https://developer.apple.com/app-store
- **Google Play Guide:** https://play.google.com/console
- **Nigeria Payment:** Flutterwave, Payoneer, Wise

---

## Next Steps

1. **This week:** Complete RevenueCat setup (Part 1-7)
2. **This week:** Submit to both stores (Part 8-9)
3. **Next week:** Apps go live after approval
4. **Next week:** Launch marketing push on LinkedIn/Twitter

**You're days away from making money! 🚀**

---

Questions? Check RevenueCat docs or contact support at their error pages.

Good luck with the launch! 🎉
