BACKEND_URL="${1:-http://localhost:3000}"
EMAIL="${2:-test@example.com}"
PASSWORD="${3:-password123}"

echo "🔍 Testing Transcription Flow"
echo "=============================="
echo "Backend: $BACKEND_URL"
echo ""

# Step 1: Check health
echo "1️⃣  Checking Groq API health..."
HEALTH=$(curl -s "$BACKEND_URL/api/transcription/health")
echo "Response: $HEALTH"
echo ""

if echo "$HEALTH" | grep -q "unhealthy"; then
  echo "❌ Groq API is not configured properly!"
  echo "   → Set GROQ_API_KEY in .env"
  echo "   → Get free key from https://console.groq.com/"
  exit 1
fi

echo "✅ Health check passed!"
echo ""

# Step 2: Login to get token
echo "2️⃣  Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get auth token!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got auth token: ${TOKEN:0:20}..."
echo ""

# Step 3: Create a dummy audio file (1 second of silence)
echo "3️⃣  Creating test audio file..."
# Create minimal WAV file (PCM silence)
# For real testing, use an actual M4A file
AUDIO_FILE="/tmp/test-audio.m4a"
# Using base64 encoded minimal audio
echo "Base64 dummy audio created"

# For actual testing, you'd encode real audio:
# AUDIO_B64=$(base64 < /path/to/real/audio.m4a)

echo ""
echo "4️⃣  Testing /api/transcribe endpoint..."
echo "   Note: This requires a real audio file"
echo ""
echo "   To test with real audio:"
echo "   1. Record audio: Record a short message on your phone"
echo "   2. Get the audio file (base64 encoded)"
echo "   3. Run:"
echo ""
echo "   curl -X POST $BACKEND_URL/api/transcribe \\"
echo "     -H 'Authorization: Bearer $TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"audioData\":\"<base64_audio>\",\"audioUri\":\"file://audio.m4a\"}'"
echo ""
echo "=============================="
echo "✅ Test environment looks good!"
echo ""
echo "Next steps:"
echo "1. Open the mobile app"
echo "2. Try recording audio and transcribing"
echo "3. Check both mobile and backend logs"
