# Payment Link System - Quick Reference (Feb 20, 2026)

## COMPLETED WORK
✅ Migration 0024 - DB schema with payment fields
✅ Schema.ts - Users + Invoices tables updated
✅ paymentInfoUtils.ts - Formatting functions
✅ server/auth.ts - PUT /api/auth/company-info endpoint
✅ PaymentInfoSection.tsx - UI component for payment method selection
✅ CompanyInfoScreen.tsx - State + handlers added (needs JSX addition)

## CRITICAL TODO
1. Add PaymentInfoSection to CompanyInfoScreen JSX (after company card)
2. Update server/invoices.ts:
   - GET /api/invoices/:id - resolve payment info
   - PATCH /api/invoices/:id - accept overrides
3. Create resolver function: resolvePaymentInfo(invoice, user)
4. PDF footer: formatPaymentInfo() + QR codes
5. WhatsApp: getPaymentInfoForWhatsApp()
6. Test all scenarios

## FILES TO MODIFY NEXT
- client/screens/CompanyInfoScreen.tsx - Add PaymentInfoSection JSX after line 280
- server/invoices.ts - GET/PATCH endpoints
- client/utils/pdfGenerator.ts - Add payment section
- client/utils/shareInvoice.ts - Add payment message

## PAYMENT METHODS SUPPORTED
- bank_transfer: account #, bank name, account name
- paypal: PayPal link
- stripe: Stripe link + QR code
- square: Square link + QR code
- mobile_money: Phone # + instructions
- custom: Free-form text

## KEY FUNCTIONS
- formatPaymentInfo(payment): string - for display
- getPaymentInfoForWhatsApp(payment): string - message format
- validatePaymentInfo(data): validation result
- getPaymentQRData(payment): QR code content (if link-based)

## NON-PAYMENT PROCESSOR MODEL
TellBill never handles money:
- User stores own payment info (bank account, PayPal, Stripe link, etc.)
- Client pays directly to user's account
- User marks paid manually when money arrives
- TellBill just facilitates payment instructions

## DATABASE SCHEMA
Users table payment fields (6):
- paymentMethodType: default "custom"
- paymentAccountNumber, paymentBankName, paymentAccountName
- paymentLink (for PayPal, Stripe, Square)
- paymentInstructions (custom text)

Invoices table override fields (6):
- Same 6 fields with "_override" suffix
- If override set, use it; else use company default

## LAST COMMITS
- 4b53542: foundation + guide
- 58af2b5: endpoint + component
