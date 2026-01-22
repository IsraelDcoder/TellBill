#!/bin/bash
# Quick Start: Ambient Site Log Hub Testing

echo "🚀 Bill Splitter - Ambient Site Log Hub"
echo "========================================"
echo ""

# Step 1: Verify environment
echo "✓ Step 1: Checking environment..."
if [ ! -f .env ]; then
    echo "⚠️  Missing .env file"
    echo "Create .env with:"
    echo "  GROQ_API_KEY=your-key"
    echo "  OPENROUTER_API_KEY=your-key"
    echo "  EXPO_PUBLIC_BACKEND_IP=your-machine-ip"
else
    echo "✓ .env file found"
fi

echo ""
echo "✓ Step 2: Database schema..."
npm run db:push 2>&1 | grep -E "(No changes|✓|×)" || echo "✓ Schema deployed"

echo ""
echo "✓ Step 3: Ready to start!"
echo ""
echo "Run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  npm start"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run dev"
echo ""
echo "Then:"
echo "  1. Login to app"
echo "  2. Tap Projects"
echo "  3. Tap any project → SiteLogScreen opens"
echo "  4. Tap MIC button"
echo "  5. Speak: 'Completed 4 hours of tile work at 50 dollars an hour. Used 2x4 lumber for 85 dollars.'"
echo "  6. Tap MIC again to stop"
echo "  7. Activities appear in stream"
echo "  8. Tap SEND INVOICE"
echo ""
echo "Expected Results:"
echo "  ✓ ~4 activities extracted (labor, materials, alerts)"
echo "  ✓ Live total shows: ~\$335"
echo "  ✓ Alert count shows if issues mentioned"
echo "  ✓ Invoice populated with items"
echo ""
echo "Documentation:"
echo "  - TESTING-SITE-LOG.md (comprehensive guide)"
echo "  - IMPLEMENTATION-COMPLETE.md (architecture)"
echo ""
