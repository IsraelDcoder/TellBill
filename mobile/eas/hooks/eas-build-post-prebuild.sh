#!/bin/bash

# EAS Build Post-Prebuild Hook
# Patches android/app/build.gradle to remove unsupported enableBundleCompression property

set -e

echo "[EAS Post-Prebuild Hook] Starting..."

APP_BUILD_GRADLE="${EAS_BUILD_WORK_DIR}/android/app/build.gradle"

if [ -f "$APP_BUILD_GRADLE" ]; then
  echo "[EAS Hook] Found android/app/build.gradle, patching..."
  
  # Remove the enableBundleCompression line if it exists
  if grep -q "enableBundleCompression" "$APP_BUILD_GRADLE"; then
    echo "[EAS Hook] Removing unsupported enableBundleCompression property..."
    sed -i.bak '/enableBundleCompression/d' "$APP_BUILD_GRADLE"
    echo "[EAS Hook] ✅ Patched successfully"
  else
    echo "[EAS Hook] enableBundleCompression not found, no patch needed"
  fi
else
  echo "[EAS Hook] ⚠️  android/app/build.gradle not found at $APP_BUILD_GRADLE"
  echo "[EAS Hook] This is expected before prebuild runs"
fi

echo "[EAS Post-Prebuild Hook] Complete"
exit 0
