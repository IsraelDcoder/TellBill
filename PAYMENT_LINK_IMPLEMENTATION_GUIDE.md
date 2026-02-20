# 🔥 PAYMENT LINK SYSTEM - IMPLEMENTATION GUIDE

## Current Status (February 20, 2026)

### ✅ COMPLETED
1. **Database Migration** (0024_add_payment_info_fields.sql)
   - Users table: 6 payment fields (methodType, accountNumber, bankName, accountName, link, instructions)
   - Invoices table: 6 override fields for per-invoice customization
   - Created indexes on payment_method_type fields

2. **Schema Updates** (shared/schema.ts)
   - Users table: Added all payment fields with proper types
   - Invoices table: Added all payment override fields
   - Types: text fields for account/bank info, link, instructions

3. **Utility Functions** (client/utils/paymentInfoUtils.ts)
   - formatPaymentInfo() - Display formatting
   - getPaymentInfoForWhatsApp() - WhatsApp template
   - getPaymentQRData() - Extract QR code data
   - validatePaymentInfo() - Field validation
   - PAYMENT_METHOD_TYPES array with icons/labels

### 🔄 NEXT STEPS (Priority Order)

#### PHASE 1: Backend Infrastructure (Priority 1)
1. **Update PUT /api/auth/company-info endpoint** (server/auth.ts)
   ```typescript
   // Accept and save payment info from CompanyInfoScreen
   // Fields: paymentMethodType, paymentAccountNumber, paymentBankName, 
   //         paymentAccountName, paymentLink, paymentInstructions
   // Return: Full user object including payment fields
   ```

2. **Add payment info to invoice endpoints** (server/invoices.ts)
   ```typescript
   // GET /api/invoices/:id
   // - Fetch invoice from DB
   // - Get user's company payment info
   // - Merge: invoice override > company default
   // - Return: invoice with resolved paymentInfo object
   
   // PATCH /api/invoices/:id
   // - Accept payment override fields
   // - Update invoice record
   // - Return: updated invoice with resolved payment info
   ```

3. **Helper function in backend** (lib/paymentResolver.ts or similar)
   ```typescript
   function resolvePaymentInfo(invoice, user) {
     // Return first non-null value for each field:
     // invoice.paymentMethodTypeOverride || user.paymentMethodType || null
     // invoice.paymentAccountNumberOverride || user.paymentAccountNumber || null
     // etc...
   }
   ```

#### PHASE 2: Frontend UI (Priority 2)
1. **PaymentInfoSection Component** (client/components/PaymentInfoSection.tsx)
   - PAYMENT_METHOD_TYPES selector (dropdown)
   - Conditional fields based on method type:
     - bank_transfer: account_number, bank_name, account_name
     - paypal/stripe/square: payment_link
     - mobile_money: account_number + instructions
     - custom: payment_instructions textarea
   - Validation feedback
   - Save button triggering API call

2. **Update CompanyInfoScreen** (client/screens/CompanyInfoScreen.tsx)
   - Add PaymentInfoSection after company info
   - Pass onSave handler to call PUT /api/auth/company-info
   - Show success notification after save
   - Load existing payment info from user context

3. **Invoice Edit Screen** (client/screens/InvoiceEditScreen.tsx)
   - Add "Override Payment Info" toggle section
   - If enabled, show same form fields as PaymentInfoSection
   - If disabled, show "Using company default" message
   - Save override fields via PATCH /api/invoices/:id

#### PHASE 3: Invoice Integration (Priority 3)
1. **PDF Generation** (client/utils/pdfGenerator.ts)
   - Add Payment Info Footer section before signature line
   - Use formatPaymentInfo() from paymentInfoUtils
   - If QR code available, embed QR code in PDF
   - Format by method type:
     - Bank: Account #, Bank Name, Account Holder
     - PayPal/Stripe/Square: Link as clickable URL
     - Mobile Money: Phone number + instructions

2. **WhatsApp Sharing** (client/utils/shareInvoice.ts)
   - Use getPaymentInfoForWhatsApp() helper
   - Add to message body as separate section
   - Format: Emoji + bold payment header + formatted details
   - Include "Pay via..." instructions

3. **InvoicePreview** (client/screens/InvoicePreviewScreen.tsx)
   - Display resolved payment info
   - Show "Using company default" or "Custom override" label
   - Let user edit before sending (optional)

#### PHASE 4: Testing & Validation (Priority 4)
1. Verify payment info saves to company profile
2. Test per-invoice override functionality
3. Check PDF generation includes payment info
4. Test WhatsApp message formatting
5. Verify all payment method types display correctly
6. Test QR code generation for links
7. Validate required fields per method

---

## Architecture Details

### Payment Info Flow
```
User Creates Invoice
  ↓
Fetch Company Payment Info (users table)
  ↓
Check if Invoice has Override Fields
  ↓
IF override exists for field → USE IT
   ELSE → USE COMPANY DEFAULT
  ↓
Resolved Payment Info Object:
{
  methodType: "bank_transfer",
  accountNumber: "1234567890",
  bankName: "Chase",
  accountName: "John Doe",
  link: null,
  instructions: null
}
  ↓
Display in PDF Footer / WhatsApp Message
```

### Payment Method Types
1. **bank_transfer**
   - Required: accountNumber, bankName
   - Optional: accountName, instructions
   - Display: Account info with bank details

2. **paypal**
   - Required: link
   - Optional: instructions
   - Display: PayPal link + QR code

3. **stripe**
   - Required: link
   - Optional: instructions
   - Display: Stripe checkout link + QR code

4. **square**
   - Required: link
   - Optional: instructions
   - Display: Square payment link + QR code

5. **mobile_money**
   - Required: accountNumber
   - Optional: instructions
   - Display: Phone number + instructions

6. **custom**
   - Required: instructions
   - Display: Custom text instructions

### Database Schema
```sql
-- Users table additions
paymentMethodType TEXT DEFAULT 'custom'
paymentAccountNumber TEXT
paymentBankName TEXT
paymentAccountName TEXT
paymentLink TEXT
paymentInstructions TEXT

-- Invoices table additions (override fields)
paymentMethodTypeOverride TEXT
paymentAccountNumberOverride TEXT
paymentBankNameOverride TEXT
paymentAccountNameOverride TEXT
paymentLinkOverride TEXT
paymentInstructionsOverride TEXT
```

---

## Implementation Code Templates

### Backend Resolver Function
```typescript
// server/lib/paymentResolver.ts
export function resolvePaymentInfo(invoice: Invoice, user: User) {
  return {
    methodType: invoice.paymentMethodTypeOverride || user.paymentMethodType,
    accountNumber: invoice.paymentAccountNumberOverride || user.paymentAccountNumber,
    bankName: invoice.paymentBankNameOverride || user.paymentBankName,
    accountName: invoice.paymentAccountNameOverride || user.paymentAccountName,
    link: invoice.paymentLinkOverride || user.paymentLink,
    instructions: invoice.paymentInstructionsOverride || user.paymentInstructions,
  };
}
```

### Frontend Save Handler
```typescript
// CompanyInfoScreen.tsx
const handleSavePaymentInfo = async (paymentData: PaymentInfoFormData) => {
  const response = await fetch(getApiUrl("/api/auth/company-info"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      userId: user.id,
      ...companyData,
      ...paymentData, // All 6 payment fields
    }),
  });
  
  const result = await response.json();
  if (result.success) {
    Alert.alert("Success", "Payment information saved!");
    // Update context with new user data
  }
};
```

### PDF Footer Template
```typescript
// client/utils/pdfGenerator.ts
// Add before signature line:

const paymentSection = `
PAYMENT INFORMATION
${formatPaymentInfo(invoice.paymentInfo)}
`;

// If QR code available:
if (paymentQRData) {
  // Generate QR code image
  // Add QR code next to payment info
}
```

---

## Testing Checklist

### Database
- [ ] Migration 0024 runs successfully
- [ ] Payment fields appear in users table
- [ ] Override fields appear in invoices table
- [ ] Indexes created successfully

### Backend
- [ ] PUT /api/auth/company-info accepts payment fields
- [ ] GET /api/invoices/:id returns resolved payment info
- [ ] PATCH /api/invoices/:id accepts override fields
- [ ] Overrides properly shadow company defaults
- [ ] Payment info returned correctly in all cases

### Frontend UI
- [ ] PaymentInfoSection renders all method types
- [ ] Conditional fields show/hide based on method
- [ ] Validation shows required field errors
- [ ] Save calls API and updates state
- [ ] CompanyInfoScreen displays payment section
- [ ] InvoiceEditScreen shows override toggle

### Invoice Integration
- [ ] PDF includes payment info footer
- [ ] Bank info displays with account #, bank, name
- [ ] PayPal/Stripe/Square shows link
- [ ] Mobile money shows phone + instructions
- [ ] QR codes generate for links
- [ ] WhatsApp message includes payment header
- [ ] Payment info formatting calls work correctly

### End-to-End
- [ ] User sets company payment info
- [ ] Invoice created with company default
- [ ] User overrides payment info on specific invoice
- [ ] PDF shows override (not company default)
- [ ] WhatsApp message includes correct payment info
- [ ] Client receives payment instructions

---

## Files Status

### Created
✅ migrations/0024_add_payment_info_fields.sql
✅ client/utils/paymentInfoUtils.ts

### Modified  
✅ shared/schema.ts

### Still Need to Create
- [ ] server/lib/paymentResolver.ts (optional - can inline in endpoints)
- [ ] client/components/PaymentInfoSection.tsx

### Still Need to Modify
- [ ] server/auth.ts (PUT /api/auth/company-info)
- [ ] server/invoices.ts (GET/PATCH endpoints)
- [ ] client/screens/CompanyInfoScreen.tsx
- [ ] client/screens/InvoiceEditScreen.tsx (optional)
- [ ] client/utils/pdfGenerator.ts
- [ ] client/utils/shareInvoice.ts
- [ ] client/screens/InvoicePreviewScreen.tsx

---

## Key Design Decisions

1. **Non-Payment Processor Model**
   - TellBill never handles money
   - User stores their own payment instructions
   - User client pays directly to user
   - User marks invoice as paid manually

2. **Company + Per-Invoice Override**
   - Reduces duplication
   - Allows flexibility per invoice
   - Cleaner data model

3. **Method-Type Based Validation**
   - Each method has required fields
   - Different display formatting
   - Better UX than generic form

4. **No Stripe Integration**
   - Avoids payment processing complexity
   - No PCI compliance needed
   - Works globally
   - User keeps 100% of payments

---

## Timeline Estimate

- **Phase 1 (Backend)**: 1.5-2 hours
- **Phase 2 (Frontend UI)**: 2-2.5 hours
- **Phase 3 (Invoice Integration)**: 1.5-2 hours
- **Phase 4 (Testing)**: 1 hour
- **Total**: 6-7.5 hours

**Can ship Phase 1-2 first** (3.5-4.5 hours) to unblock users from setting up payment info, then ship Phase 3 (PDF/WhatsApp integration) next.

---

**Last Updated**: 2025-01-29  
**Next Person**: Start with PHASE 1, Task 1 (Update PUT /api/auth/company-info)
