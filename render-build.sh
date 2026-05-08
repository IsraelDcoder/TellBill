#!/bin/bash

# TellBill Backend Build Script for Render
# This script runs the necessary build steps for the Node.js backend

set -e

echo "🔨 Building TellBill backend..."

# Install dependencies (including devDependencies for build tools)
npm ci --include=dev

# Compile TypeScript to dist/
npm run build

echo "✅ Build complete!"
echo "📂 Compiled output in dist/"
