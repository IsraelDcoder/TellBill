# TellBill EAS Build & Google Play Console Setup Guide

## 🚀 Complete Workflow: Build → Google Play → RevenueCat

This guide walks you through building the TellBill app with Expo EAS and connecting it to Google Play Console and RevenueCat.

---

## **Phase 1: Prepare Your Environment**

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo Account

```bash
eas login
```

You'll need an Expo account. Create one at https://expo.dev if you don't have one.

### Step 3: Verify EAS Project

```bash
eas project:info
```

This shows your project ID (needed for builds).

---

## **Phase 2: Configure Google Play Console**

### Step 1: Create Google Play Service Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Settings** → **API access**
3. Create a **Service Account** (if not already created)
4. Generate a **JSON private key**:
   - Click **Manage service accounts**
   - In Google Cloud Console, find the service account
   - Click **Keys** → **Add Key** → **Create new key**
   - Choose **JSON** format
   - Download the key file
   - **Save as** `./credentials.json` in project root ⚠️ **Don't commit this!**

### Step 2: Add credentials.json to .gitignore

```bash
echo "credentials.json" >> .gitignore
```

### Step 3: Create App in Google Play Console

1. Go to Google Play Console
2. **Create application** → Name: "TellBill"
3. Select **Category**: "Business"
4. Create:
   - App listing
   - Fill in app description, screenshots, etc.
   - **Don't submit yet** - we need to test builds first

### Step 4: Get Google Play Service Account Email

From Google Cloud Console:
- Service Accounts page
- Copy the service account email (looks like: `xxx@yyy.iam.gserviceaccount.com`)
- Add it as **Owner** in Google Play Console (Settings → Users and permissions)

---

## **Phase 3: Configure RevenueCat in App**

### Step 1: Set Environment Variables in EAS

In the EAS dashboard or via CLI, set build secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY --value appl_xxxxx_from_revenuecat
```

Your RevenueCat public API key from: https://dashboard.revenuecat.com/settings/api-keys

### Step 2: Verify app.json Configuration

Check that `app.json` has correct settings:

```json
{
  "expo": {
    "name": "TellBill",
    "slug": "tellbill",
    "version": "1.0.0",
    "android": {
      "package": "com.tellbill.app",
      "versionCode": 1,
      "playStoreUrl": "https://play.google.com/store/apps/details?id=com.tellbill.app"
    },
    "ios": {
      "bundleIdentifier": "com.tellbill.app",
      "buildNumber": "1"
    }
  }
}
```

---

## **Phase 4: Build with EAS**

### Option A: Build Preview APK (Test before production)

**Best for testing on real device:**

```bash
eas build --platform android --profile preview
```

**What this does:**
- Builds APK (not production ready, but installable)
- Takes ~10-15 minutes
- Provides download link + QR code
- You can install directly on device: `adb install app-preview.apk`

**Test checklist:**
- Google sign-in works ✅
- Can view landing page ✅
- Subscription options visible ✅
- RevenueCat initialized ✅

### Option B: Build Production App Bundle (For Play Store)

**For submitting to Google Play:**

```bash
eas build --platform android --profile production
```

**What this does:**
- Builds `.aab` (Android App Bundle - required by Play Store)
- Takes ~15-20 minutes
- Output ready for Play Store submission
- Creates release signed with your cert

---

## **Phase 5: Connect RevenueCat to Google Play**

### Step 1: Get Google Play Service Account JSON

You already created this in Phase 2 - same file needed here.

### Step 2: Upload to RevenueCat

1. Go to [RevenueCat Dashboard](https://dashboard.revenuecat.com)
2. **Project Settings** → **Integrations** → **Google Play**
3. Upload your `credentials.json` file
4. RevenueCat verifies connection

### Step 3: Create Products in RevenueCat

Create these **product IDs** (must match Google Play):

```
solo_monthly       ($9.99/month)
solo_annual        ($99.99/year)
professional_monthly ($29.99/month)
professional_annual ($299.99/year)
```

**In Google Play Console:**
1. Your App → **Monetization setup** → **Create in-app product**
2. Create each product listed above
3. Set prices (must match RevenueCat)
4. Set to "Active"
5. Copy exact product IDs

**In RevenueCat:**
1. Create products with matching IDs
2. Assign to entitlements: `solo` or `professional`

### Step 4: Set Webhook in RevenueCat

1. RevenueCat → Project Settings → Webhooks
2. Add webhook URL: `https://api.tellbill.app/api/webhooks/revenuecat`
3. RevenueCat sends purchase events to this endpoint

---

## **Phase 6: Submit to Google Play Console**

### Step 1: Upload Build

1. Google Play Console → Your App → **Release** → **Create release**
2. Under **Android App Bundle**:
   - Upload your `.aab` file from EAS build
   - RevenueCat will validate

### Step 2: Fill App Details

- **App title**: TellBill
- **Short description**: Construction invoicing with AI
- **Full description**: [Your detailed description]
- **Screenshots**: 2-5 phone screenshots
- **Feature graphic**: 1024x500px
- **Icon**: 512x512px
- **Content rating**: Take questionnaire
- **Target audience**: Contractors
- **Content**: No inappropriate content

### Step 3: Add Privacy Policy

- Attach: `landing/privacy-policy.html`
- Or URL: `https://tellbill.app/privacy`

### Step 4: Review & Submit

1. Check all required fields
2. **Review release** → **Submit for review**
3. Google reviews (usually 24-48 hours)

---

## **Test Purchases Before Launch**

### Setup Test Account in Google Play Console

1. Settings → Licenses & testing
2. Add test account email
3. Install app on device signed in with test account
4. Test purchases:
   - Select subscription
   - Complete purchase
   - Verify in RevenueCat dashboard
   - Check app shows "$0.00 (TEST)"

### Verify RevenueCat Webhook

After test purchase:
1. RevenueCat Dashboard → Events
2. Should see `INITIAL_PURCHASE` event
3. Backend should receive webhook
4. User subscription updated in database

---

## **Build Command Reference**

```bash
# Preview build (testing on real device)
eas build --platform android --profile preview

# Production build (for Play Store submission)
eas build --platform android --profile production

# iOS builds (add when ready)
eas builds --platform ios --profile preview     # iOS TestFlight
eas build --platform ios --profile production   # iOS App Store

# List all builds
eas builds

# Download specific build
eas build:download

# View build logs
eas build:view <build_id>

# Check secrets set in EAS
eas secret:list --scope project
```

---

## **Troubleshooting**

### Build Fails with "API key not found"

Make sure RevenueCat public key is set in EAS secrets:
```bash
eas secret:list --scope project
# Should show EXPO_PUBLIC_REVENUECAT_API_KEY
```

If missing, add it:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY --value appl_xxxxx
```

### Google Play Rejects Build

Common reasons:
- Wrong target API level (must be latest)
- Missing app icon
- Missing privacy policy
- RevenueCat missing from app binary

**Check app.json:**
```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
}
```

### RevenueCat Not Initializing in App

Check:
1. API key set in EAS secrets ✅
2. RevenueCat SDK installed: `npm list react-native-purchases`
3. Called `initializeRevenueCat()` on app startup
4. Check logs: `[RevenueCat] ✅ Initialized successfully`

### Test Purchases Not Working

Verify:
1. Test account added to Google Play Console ✅
2. Logged in device with test account ✅
3. In-app products created and active ✅
4. RevenueCat SDK initialized ✅
5. App has internet permission ✅

---

## **Timeline**

| Phase | Time | Action |
|-------|------|--------|
| **Setup** | 15 min | Install EAS, login, create Service Account |
| **Build Preview** | 20 min | Run EAS build, test on device |
| **RevenueCat Setup** | 10 min | Connect Google Play, create products |
| **Test Purchases** | 15 min | Test with test account |
| **Production Build** | 20 min | Run production build |
| **Play Store Submit** | 10 min | Upload & submit for review |
| **Review Wait** | 24-48 hrs | Google reviews your app |
| **Launch** | 5 min | Release to production |

**Total: ~2 hours active time + 24-48 hours review**

---

## **Next Steps Checklist**

- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Create Google Service Account & download JSON
- [ ] Set RevenueCat public key in EAS secrets
- [ ] Build preview: `eas build --platform android --profile preview`
- [ ] Test on device
- [ ] Create products in RevenueCat & Google Play (matching IDs)
- [ ] Test purchase with test account
- [ ] Build production: `eas build --platform android --profile production`
- [ ] Submit to Google Play
- [ ] Wait for review & approval
- [ ] Release to production

**Questions?** Check [EAS Documentation](https://docs.expo.dev/eas/) or [RevenueCat Setup Guide](https://docs.revenuecat.com/docs/react-native)

