#!/usr/bin/env node

/**
 * EAS Build Post Hook
 * Fixes gradle configuration issues after prebuild
 */

const fs = require('fs');
const path = require('path');

console.log('[EAS Hook] Running post-build fixes...');

// Fix 1: Remove unsupported enableBundleCompression property
const appBuildGradlePath = path.join(
  process.env.EAS_BUILD_WORK_DIR || process.cwd(),
  'android/app/build.gradle'
);

if (fs.existsSync(appBuildGradlePath)) {
  let content = fs.readFileSync(appBuildGradlePath, 'utf8');
  
  // Remove or comment out the enableBundleCompression line
  const originalContent = content;
  content = content.replace(
    /^\s*enableBundleCompression = \(findProperty\('android\.enableBundleCompression'\) \?: false\)\.toBoolean\(\)\s*$/m,
    '    // enableBundleCompression - removed: not supported in React Native 0.76.5'
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(appBuildGradlePath, content, 'utf8');
    console.log('[EAS Hook] ✅ Fixed enableBundleCompression in android/app/build.gradle');
  }
} else {
  console.log('[EAS Hook] ⚠️  android/app/build.gradle not found at', appBuildGradlePath);
}

console.log('[EAS Hook] Post-build fixes complete');
