# Testing Input Validation

## Quick Test Cases

### 1. Test Signup Validation

#### Invalid Email:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "TellBill@2024"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

#### Weak Password:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "weak"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    },
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    },
    {
      "field": "password",
      "message": "Password must contain at least one special character (!@#$%^&*)"
    }
  ]
}
```

---

#### Valid Signup:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "TellBill@2024",
    "name": "John Doe"
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. Test Login Validation

#### Missing Email:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "TellBill@2024"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

#### Valid Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "TellBill@2024"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 3. Test Payment Validation

#### Invalid Plan ID:
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "planId": "invalid-plan",
    "email": "user@example.com",
    "userFullName": "John Doe"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "planId",
      "message": "Plan ID must be solo, team, or enterprise"
    }
  ]
}
```

---

#### Invalid Email:
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "planId": "solo",
    "email": "not-an-email",
    "userFullName": "John Doe"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

#### Valid Payment:
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "planId": "solo",
    "email": "user@example.com",
    "phoneNumber": "+234123456789",
    "userFullName": "John Doe"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "reference": "tellbill_solo_550e8400-e29b-41d4-a716-446655440000_1705335000000"
}
```

---

### 4. Test Invoice Validation

#### Invalid Method:
```bash
curl -X POST http://localhost:3000/api/invoices/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "telegram",
    "contact": "user@example.com",
    "clientName": "Client Name"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "method",
      "message": "Method must be email, sms, or whatsapp"
    }
  ]
}
```

---

#### Email Method with Phone Contact:
```bash
curl -X POST http://localhost:3000/api/invoices/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "email",
    "contact": "+234123456789",
    "clientName": "Client Name"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "contact",
      "message": "Invalid email format"
    }
  ]
}
```

---

#### SMS Method with Email Contact:
```bash
curl -X POST http://localhost:3000/api/invoices/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "sms",
    "contact": "user@example.com",
    "clientName": "Client Name"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "contact",
      "message": "Invalid phone number format"
    }
  ]
}
```

---

#### Valid Email Send:
```bash
curl -X POST http://localhost:3000/api/invoices/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "email",
    "contact": "client@example.com",
    "clientName": "Client Name"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Invoice sent successfully"
}
```

---

#### Valid SMS Send:
```bash
curl -X POST http://localhost:3000/api/invoices/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "sms",
    "contact": "+234123456789",
    "clientName": "Client Name"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Invoice sent via SMS"
}
```

---

## Password Strength Examples

### ✅ Valid Passwords (All requirements met):
```
TellBill@2024
SecurePassword123!
MyApp#Pass99
Secure$Pwd2024
Complex&Password1
```

### ❌ Invalid Passwords (Missing requirements):
```
password123        → Missing: uppercase, special char
Pass123            → Missing: 8+ chars, special char
ALLUPPERCASE!1     → Missing: lowercase
short@1            → Missing: 8+ chars
NoSpecialChars123  → Missing: special char
```

---

## Testing in Postman

1. **Create a new request**
2. **Select method**: POST
3. **URL**: `http://localhost:3000/api/auth/signup`
4. **Headers**: 
   ```
   Content-Type: application/json
   ```
5. **Body** (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "TellBill@2024"
   }
   ```
6. **Send** and check response

---

## Automated Testing (Node.js)

```typescript
// test-validation.ts
import axios from "axios";

async function testValidation() {
  const BASE_URL = "http://localhost:3000";

  // Test invalid email
  try {
    await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: "invalid-email",
      password: "TellBill@2024",
    });
  } catch (error: any) {
    console.log("✓ Invalid email rejected:", error.response.data.details[0]);
  }

  // Test weak password
  try {
    await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: "user@example.com",
      password: "weak",
    });
  } catch (error: any) {
    console.log("✓ Weak password rejected:", error.response.data.details[0]);
  }

  // Test valid signup
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/signup`, {
      email: "user@example.com",
      password: "TellBill@2024",
      name: "John Doe",
    });
    console.log("✓ Valid signup accepted:", response.data.user.email);
  } catch (error: any) {
    console.log("✗ Valid signup failed:", error.response.data.error);
  }
}

testValidation().catch(console.error);
```

---

## Summary

All validation tests should:
- ✅ Return 400 for invalid inputs
- ✅ Return detailed error messages
- ✅ Return 200/201 for valid inputs
- ✅ Sanitize and normalize data
- ✅ Prevent security attacks
