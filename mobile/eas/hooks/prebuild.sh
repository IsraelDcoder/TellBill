#!/bin/bash

# EAS Pre-Build Hook for TellBill
# Patches gradle configuration before build

echo "[EAS Hook] Running pre-build fixes..."

# This hook runs BEFORE prebuild, so we can't modify android/ yet
# We'll use app.json configuration instead

exit 0
