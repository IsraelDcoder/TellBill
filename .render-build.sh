#!/bin/bash
set -e

echo "🔨 Building TellBill backend..."
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

echo "📦 Installing dependencies (including devDependencies for build tools)..."
npm ci --include=dev

echo "🏗️ Compiling TypeScript with esbuild..."
npm run build

echo "✅ Build complete. server_dist/index.js ready for deployment."
ls -lh server_dist/index.js
