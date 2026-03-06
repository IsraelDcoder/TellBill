#!/bin/bash
# EAS Build Hook - Pre-install
# Fixes Android support library conflicts before build starts

set -e

# Create Gradle configuration to force exclude old support libraries
mkdir -p /tmp/eas-gradle-init

cat > /tmp/eas-gradle-init/init.gradle << 'EOF'
// Force exclude old support libraries, keep only AndroidX
allprojects {
  configurations.all {
    // Exclude old Android support libraries
    exclude group: 'com.android.support'
    
    resolutionStrategy {
      // Force AndroidX versions
      force 'androidx.core:core:1.16.0'
      force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
      
      // Don't allow old support libraries
      eachDependency { DependencyResolveDetails details ->
        if (details.requested.group == 'com.android.support') {
          details.cancel()
        }
      }
    }
  }
}
EOF

echo "✅ Created Gradle init script to exclude old support libraries"
