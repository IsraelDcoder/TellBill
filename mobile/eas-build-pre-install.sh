#!/bin/bash

# EAS Build Pre-Install Hook
# Ensures kotlinVersion is defined in gradle.properties after expo prebuild

set -e

echo "🔧 EAS Build Pre-Install Hook: Configuring Gradle properties..."

# Ensure android directory exists
mkdir -p android

# Add kotlinVersion to gradle.properties if not present
GRADLE_PROPS="android/gradle.properties"

if ! grep -q "^kotlinVersion=" "$GRADLE_PROPS"; then
  echo "" >> "$GRADLE_PROPS"
  echo "# Kotlin version (added by eas-build-pre-install.sh)" >> "$GRADLE_PROPS"
  echo "kotlinVersion=2.0.20" >> "$GRADLE_PROPS"
  echo "✅ Added kotlinVersion=2.0.20 to gradle.properties"
else
  echo "✅ kotlinVersion already present in gradle.properties"
fi

# Verify gradle.properties
if grep -q "^kotlinVersion=2.0.20" "$GRADLE_PROPS"; then
  echo "✅ gradle.properties verification passed"
else
  echo "❌ ERROR: kotlinVersion not properly set in gradle.properties"
  exit 1
fi

echo "✅ Pre-install hook completed successfully"
