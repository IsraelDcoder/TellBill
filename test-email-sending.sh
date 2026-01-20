#!/bin/bash

# Real Email Sending Test Script
# Usage: bash test-email-sending.sh

echo "================================"
echo "Real Email Sending Test"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API key is set
if [ -z "$RESEND_API_KEY" ]; then
  echo -e "${RED}❌ ERROR: RESEND_API_KEY not set${NC}"
  echo ""
  echo "To fix:"
  echo "1. Open .env file"
  echo "2. Add: RESEND_API_KEY=your_api_key_here"
  echo "3. Get API key from: https://resend.com"
  exit 1
fi

echo -e "${GREEN}✅ RESEND_API_KEY found${NC}"
echo ""

# Check if server is running
echo "Checking if server is running on localhost:3000..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Server not running${NC}"
  echo ""
  echo "Start the server with:"
  echo "  npm run server:dev"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test email sending
echo "Testing email send..."
echo ""

RESPONSE=$(curl -X POST http://localhost:3000/api/invoices/send \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "TEST-001",
    "method": "email",
    "contact": "client@example.com",
    "clientName": "Test Client",
    "invoiceData": {
      "amount": 100.00,
      "dueDate": "2026-02-19",
      "description": "Test invoice"
    }
  }')

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo -e "${GREEN}✅ Email sent successfully!${NC}"
    echo ""
    echo "Next step:"
    echo "1. Check your email inbox for the invoice from noreply@tellbill.com"
    echo "2. Verify the email contains:"
    echo "   - Invoice #TEST-001"
    echo "   - Amount: $100.00"
    echo "   - Due Date: 2026-02-19"
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    echo ""
    echo -e "${RED}❌ Email send failed: $ERROR${NC}"
  fi
else
  echo ""
  echo -e "${RED}❌ Invalid response${NC}"
fi

echo ""
