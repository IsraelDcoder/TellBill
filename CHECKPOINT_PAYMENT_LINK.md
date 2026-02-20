# CHECKPOINT: Payment Link System - Feb 20, 2026

## COMPLETED (75%+)
✅ DB migration 0024
✅ schema.ts updated  
✅ paymentInfoUtils.ts complete
✅ PaymentInfoSection.tsx component
✅ PUT /api/auth/company-info endpoint
✅ CompanyInfoScreen JSX (PaymentInfoSection added)
✅ server/lib/paymentResolver.ts CREATED

## IN PROGRESS (TASK 2)
🔄 Update server/invoices.ts:
   - Add import: import { resolvePaymentInfo } from "@/lib/paymentResolver"
   - Update GET /api/invoices/:id - add payment resolution
   - Add PATCH /api/invoices/:id - for payment overrides

## STILL TODO (1.5 hours)
⏳ Task 3: PDF - client/utils/pdfGenerator.ts (add payment footer + QR)
⏳ Task 4: WhatsApp - client/utils/shareInvoice.ts (add payment message)
⏳ Task 5: Testing (4 scenarios)

## CRITICAL CODE TO ADD

### server/invoices.ts - Find existing GET endpoint and update:
```typescript
import { resolvePaymentInfo } from "@/lib/paymentResolver";

app.get("/api/invoices/:id", async (req: Request, res: Response) => {
  const invoice = await db.select().from(invoices).where(eq(invoices.id, id));
  
  // ✅ FETCH USER PAYMENT INFO
  const user = await db.select().from(users).where(eq(users.id, invoice[0].userId));
  
  // ✅ RESOLVE PAYMENT INFO
  const paymentInfo = resolvePaymentInfo(invoice[0], user[0]);
  
  // RETURN WITH PAYMENT INFO
  return res.json({
    success: true,
    invoice: {
      ...invoice[0],
      paymentInfo,
    },
  });
});
```

### server/invoices.ts - Add PATCH endpoint after GET:
```typescript
app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
  const {
    paymentMethodTypeOverride,
    paymentAccountNumberOverride,
    paymentBankNameOverride,
    paymentAccountNameOverride,
    paymentLinkOverride,
    paymentInstructionsOverride,
  } = req.body;

  const updated = await db.update(invoices).set({
    paymentMethodTypeOverride,
    paymentAccountNumberOverride,
    paymentBankNameOverride,
    paymentAccountNameOverride,
    paymentLinkOverride,
    paymentInstructionsOverride,
  }).where(eq(invoices.id, id)).returning();

  const user = await db.select().from(users).where(eq(users.id, updated[0].userId));
  const paymentInfo = resolvePaymentInfo(updated[0], user[0]);

  return res.json({
    success: true,
    invoice: {
      ...updated[0],
      paymentInfo,
    },
  });
});
```

## PDF TASK NEXT
File: client/utils/pdfGenerator.ts
- Import: formatPaymentInfo, getPaymentQRData from paymentInfoUtils
- Add after invoice totals, before signature:
  - Payment header text
  - Format payment info
  - Add QR code if link-based (PayPal, Stripe, Square)

## WHATSAPP TASK AFTER PDF
File: client/utils/shareInvoice.ts
- Import: getPaymentInfoForWhatsApp
- Add payment text to message before submitting

## COMMITS SO FAR
4b53542 → 58af2b5 → dabb0b1 → 1625e31 → d7b794f → 6b83adc → [next]

## NEXT DEVELOPER
1. Quickly update server/invoices.ts (copy code above)
2. Add server/lib/paymentResolver.ts import
3. Then do PDF integration
4. Then WhatsApp
5. Test all 4 scenarios

SHOULD BE DONE IN 1.5-2 HOURS
