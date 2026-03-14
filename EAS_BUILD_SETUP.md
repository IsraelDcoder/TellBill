# Expo EAS Build Setup Guide

## Overview
We've switched from GitHub Actions local Gradle builds to **Expo EAS Build**, which is purpose-built for React Native/Expo projects and handles dependency conflicts much better than local Gradle.

## Benefits
- ✅ Better dependency conflict resolution
- ✅ No more DEX duplicate class errors
- ✅ Managed build servers (consistent environment)
- ✅ Automatic signing for Play Store releases
- ✅ Web dashboard for monitoring builds
- ✅ Faster builds due to Expo's optimized infrastructure

## Setup Steps

### 1. Install Expo CLI
```bash
npm install -g eas-cli
```

### 2. Create/Login to Expo Account
```bash
eas auth:login
```
- Go to https://expo.dev/signup if you don't have an account
- Use same account for all team members

### 3. Initialize EAS in Project (if not done)
```bash
eas init
```
- This links your local project to Expo
- Creates .eas/metadata.json (add to .gitignore if needed)

### 4. Add EAS_TOKEN to GitHub Secrets
```bash
# Get your token locally
eas tokens:create
```
- Go to GitHub repo → Settings → Secrets and variables → Actions
- Create new secret: `EAS_TOKEN` with the token value
- New builds will auto-authenticate with GitHub Actions

### 5. Test Build Locally (Optional)
```bash
# Preview build (faster, development-friendly APK)
eas build --platform android --profile preview

# Production build (full optimization, signed AAB)
eas build --platform android --profile production

# With wait flag to monitor progress
eas build --platform android --profile production --wait
```

## Build Profiles in eas.json

### preview
- **Output**: APK (debuggable)
- **Use case**: Testing, development
- **Signing**: Expo-managed
- **Size**: Larger, unoptimized
- **Time**: ~30 minutes

### production
- **Output**: App Bundle (AAB) - Ready for Play Store
- **Use case**: Production release
- **Signing**: Your keystore (if configured)
- **Size**: Smaller, fully optimized
- **Features**: R8 minification, resource shrinking, Hermes engine
- **Time**: ~45 minutes

## Current eas.json Configuration

The production profile includes:
- **buildType**: `app-bundle` (AAB for Play Store)
- **Gradle command**: `bundleRelease` with 6GB heap
- **Optimization**: R8 horizontal+vertical class merging
- **Dependencies**: Jetifier + AndroidX enabled
- **Signing**: Play Store signing configured

## Automatic GitHub Actions Build

Commits to `main` branch will automatically trigger `eas build --platform android`.

### To Deploy to Play Store

After build completes:
```bash
# Option 1: Upload through Google Play Console manually
# Download AAB from EAS dashboard → Upload to Play Store Console

# Option 2: Use Play Store API (advanced)
# Configure service account and use fastlane
fastlane supply --aab build/app-release.aab
```

## Debugging Build Issues

### View Build Logs
```bash
# List recent builds
eas builds --platform android

# View specific build details
eas builds --platform android --limit 5

# Download logs from dashboard
# https://expo.dev/builds
```

### Common Issues & Fixes

#### "EAS_TOKEN not set"
```bash
eas auth:login
# or add token to GitHub Secrets
```

#### Build fails with outdated dependencies
- EAS uses same Gradle config as local builds
- Our android/build.gradle substitution rules are still applied
- If issues persist, check `.gradle` cache in EAS dashboard

#### Build succeeds but APK won't install
```bash
# Check device compatibility
# AABs must be signed - use Play Store console or Expo signing

# For direct APK testing, use preview profile
eas build --platform android --profile preview --wait
```

## Monitoring Builds

### EAS Dashboard
```
https://expo.dev
→ Your project
→ Builds tab
→ View build status, logs, and download artifacts
```

### GitHub Actions
- Commits to main auto-trigger EAS builds
- Status visible in GitHub PR/commit
- Results linked to EAS dashboard

## Next Steps

1. **Install EAS CLI locally**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas auth:login
   ```

3. **Add GitHub Secret** (EAS_TOKEN)
   - Go to repo Settings → Secrets → New secret
   - Add `EAS_TOKEN` with value from `eas tokens:create`

4. **Test Production Build**
   ```bash
   eas build --platform android --profile production --wait
   ```

5. **Push to main** to trigger automatic GitHub Actions build

## Rollback Plan (Back to Local Gradle)

If you need to revert to local Gradle builds:
```bash
# Re-enable GitHub Actions workflow
git checkout -- .github/workflows/build-android.yml

# Skip EAS
git checkout -- eas.json
```

But **EAS Build is recommended** for production releases with React Native/Expo projects.

## Resources

- **Expo EAS Documentation**: https://docs.expo.dev/eas-build/introduction/
- **Play Store Release Guide**: https://docs.expo.dev/deploy/submit-to-app-stores/
- **Troubleshooting**: https://docs.expo.dev/eas-build/troubleshooting/
- **Build Profiles**: https://docs.expo.dev/eas-build/build-profiles/

---

**Status**: EAS Build is now the primary production build method.
GitHub Actions workflows are configured to use EAS instead of local Gradle.
