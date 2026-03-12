# Android Build GitHub Secrets Setup Guide

The GitHub Actions workflow requires secure configuration of Android signing credentials via GitHub Secrets. Follow these steps to set up the workflow properly.

## Overview

The `build-android.yml` workflow needs 4 secrets to sign and build the Android APK and App Bundle for Google Play Store:

1. **KEYSTORE_RELEASE_B64** - Base64-encoded release.keystore file
2. **KEYSTORE_PASSWORD** - Password for the keystore file
3. **KEY_ALIAS** - Alias of the signing key inside the keystore
4. **KEY_PASSWORD** - Password for the signing key

## Why Secrets?

- Keystore files contain cryptographic keys used to sign your app
- Never commit keystores to git repositories
- GitHub Secrets encrypt these values and expose them only to trusted workflows
- The workflow reads them safely without logging sensitive data

## Setup Instructions

### Option A: Use Existing Local Keystore

If you already have `android/app/release.keystore`:

#### 1. Encode the Keystore File

```bash
# On macOS/Linux:
base64 -w 0 android/app/release.keystore

# On Windows (PowerShell):
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('android/app/release.keystore')) | clip
```

This creates a long string that starts with `MIIIzQIBA...`. Copy this entire output.

#### 2. Add GitHub Secrets

Open your repository on GitHub:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each secret below:

**Secret 1: KEYSTORE_RELEASE_B64**
- Name: `KEYSTORE_RELEASE_B64`
- Value: Paste the base64-encoded keystore string from step 1

**Secret 2: KEYSTORE_PASSWORD**
- Name: `KEYSTORE_PASSWORD`
- Value: Your keystore password (e.g., `tellbill123`)

**Secret 3: KEY_ALIAS**
- Name: `KEY_ALIAS`
- Value: Your key alias (e.g., `tellbill-release`)

**Secret 4: KEY_PASSWORD**
- Name: `KEY_PASSWORD`
- Value: Your key password (usually same as keystore password)

### Option B: Generate New Release Keystore

If you don't have a keystore yet, generate one:

```bash
keytool -genkey -v -keystore android/app/release.keystore \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias tellbill-release

# When prompted:
# - Keystore password: (choose a strong password)
# - Key password: (can be same as keystore password)
# - First and Last Name: TellBill
# - Organization: IsraelDcoder (or your org)
```

Then follow **Option A** to encode and add to GitHub Secrets.

### Option C: Use EAS Build (Recommended for Expo projects)

If you prefer not to manage keystores manually, use Expo's managed build service:

```bash
# Build with EAS (handles signing automatically)
eas build -p android --remote

# EAS manages keystores securely and builds in the cloud
```

Then update the workflow to use EAS instead of local gradle builds. See `eas.json` for configuration.

## Verification

After adding the secrets, trigger a new workflow run:

1. Go to the repository's **Actions** tab
2. Click **Build Android APK and Bundle**
3. Click **Run workflow** → **Run workflow**

If secrets are configured correctly:
- ✅ The "Setup Release Keystore from Secret" step succeeds
- ✅ The "Verify Release Keystore Exists" step succeeds
- ✅ APK and Bundle build successfully

If secrets are misconfigured:
- ❌ Workflow shows clear error messages indicating which secret is missing
- ❌ No sensitive data is logged

## Troubleshooting

### Error: "KEYSTORE_RELEASE_B64 secret not configured"

**Solution**: Add the `KEYSTORE_RELEASE_B64` secret following steps above.

### Error: "Invalid keystore format"

**Possible causes**:
- Keystore file got corrupted during base64 encoding
- Wrong file was encoded
- Encoding was truncated

**Solution**: Re-encode the keystore:
```bash
base64 -w 0 android/app/release.keystore > /tmp/keystore.b64
cat /tmp/keystore.b64
```
Copy the ENTIRE output (check length matches original keystore size × ~1.33).

### Error: "Keystore password incorrect"

**Solution**: Verify `KEYSTORE_PASSWORD` and `KEY_PASSWORD` match actual passwords from keystore creation.

### Build succeeds but app signing fails in Google Play

**Possible causes**:
- `KEY_ALIAS` doesn't match actual key alias in keystore
- Using debug alias instead of release alias

**Solution**: Verify the key alias:
```bash
keytool -list -v -keystore android/app/release.keystore

# Look for "Alias name: <your-alias>"
```

## Security Best Practices

1. ✅ **Never commit the keystore file** to git
2. ✅ **Never hardcode passwords** in files
3. ✅ **Rotate keystores** periodically (especially if team members leave)
4. ✅ **Use strong passwords** (16+ characters with mixed case, numbers, symbols)
5. ✅ **Limit secret access** to trusted branch protections
6. ✅ **Audit secret usage** in workflow logs (GitHub masks secret values automatically)

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Keytool Manual](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/keytool.html)
- [Expo EAS Build](https://docs.expo.dev/eas-update/introduction/)
