# PAYMENT LINK SYSTEM - IMPLEMENTATION CODE (Ready to Copy-Paste)

## STATUS
✅ TASK 1 COMPLETE: CompanyInfoScreen JSX added  
Next: Tasks 2-5 (Invoice endpoints, PDF, WhatsApp, Testing)

---

## TASK 2: Invoice Endpoints - Payment Resolution (1.5 hours)

### Step 1: Create Payment Resolver (server/lib/paymentResolver.ts)

```typescript
import { Invoice, User } from "@shared/schema";

export interface ResolvedPaymentInfo {
  methodType: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  link?: string;
  instructions?: string;
}

/**
 * Resolve payment info: invoice override > company default
 * Returns payment info object with all fields
 */
export function resolvePaymentInfo(
  invoice: any,
  user: any
): ResolvedPaymentInfo {
  return {
    methodType:
      invoice.paymentMethodTypeOverride ||
      user.paymentMethodType ||
      "custom",
    accountNumber:
      invoice.paymentAccountNumberOverride ||
      user.paymentAccountNumber ||
      undefined,
    bankName:
      invoice.paymentBankNameOverride ||
      user.paymentBankName ||
      undefined,
    accountName:
      invoice.paymentAccountNameOverride ||
      user.paymentAccountName ||
      undefined,
    link:
      invoice.paymentLinkOverride ||
      user.paymentLink ||
      undefined,
    instructions:
      invoice.paymentInstructionsOverride ||
      user.paymentInstructions ||
      undefined,
  };
}
```

### Step 2: Update GET /api/invoices/:id (server/invoices.ts)

Find the endpoint and add payment resolution:

```typescript
app.get("/api/invoices/:id", async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice || invoice.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // ✅ Fetch user payment info
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, invoice[0].userId))
      .limit(1);

    const inv = invoice[0];
    
    // ✅ Resolve payment info
    const paymentInfo = resolvePaymentInfo(inv, user[0]);

    // ✅ Return invoice with resolved payment info
    return res.json({
      success: true,
      invoice: {
        ...inv,
        paymentInfo, // Add resolved payment info to response
      },
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return res.status(500).json({ error: "Failed to fetch invoice" });
  }
});
```

### Step 3: Add PATCH /api/invoices/:id Override (server/invoices.ts)

Add new endpoint to allow per-invoice payment override:

```typescript
/**
 * PATCH /api/invoices/:id
 * Update invoice payment info overrides
 */
app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const {
      paymentMethodTypeOverride,
      paymentAccountNumberOverride,
      paymentBankNameOverride,
      paymentAccountNameOverride,
      paymentLinkOverride,
      paymentInstructionsOverride,
      // Other fields: clientName, status, etc...
    } = req.body;

    // Fetch invoice + user
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice || invoice.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const inv = invoice[0];

    // ✅ Update invoice with payment overrides
    const updated = await db
      .update(invoices)
      .set({
        paymentMethodTypeOverride,
        paymentAccountNumberOverride,
        paymentBankNameOverride,
        paymentAccountNameOverride,
        paymentLinkOverride,
        paymentInstructionsOverride,
        // ... other fields
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // ✅ Resolve and return updated invoice
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, inv.userId))
      .limit(1);

    const paymentInfo = resolvePaymentInfo(updated[0], user[0]);

    return res.json({
      success: true,
      invoice: {
        ...updated[0],
        paymentInfo,
      },
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return res.status(500).json({ error: "Failed to update invoice" });
  }
});
```

---

## TASK 3: PDF Integration (1 hour)

### Update pdfGenerator.ts - Add Payment Footer

Find where you close the invoice items/totals section and add:

```typescript
// In your PDF generation function, after the main invoice content:

import { formatPaymentInfo, getPaymentQRData } from "@/utils/paymentInfoUtils";
import QRCode from "qrcode"; // npm install qrcode

// ... existing invoice content ...

// ✅ ADD PAYMENT SECTION BEFORE SIGNATURE LINE
const paymentText = formatPaymentInfo({
  methodType: invoice.paymentInfo?.methodType,
  accountNumber: invoice.paymentInfo?.accountNumber,
  bankName: invoice.paymentInfo?.bankName,
  accountName: invoice.paymentInfo?.accountName,
  link: invoice.paymentInfo?.link,
  instructions: invoice.paymentInfo?.instructions,
});

// Add payment header section
doc.setFontSize(12);
doc.setFont(undefined, "bold");
doc.text("PAYMENT INFORMATION", 20, pageHeight - 80);

doc.setFontSize(10);
doc.setFont(undefined, "normal");
const paymentLines = paymentText.split("\n");
let yPos = pageHeight - 75;
paymentLines.forEach((line) => {
  if (yPos < 20) {
    doc.addPage();
    yPos = 20;
  }
  doc.text(line, 20, yPos);
  yPos += 6;
});

// ✅ ADD QR CODE IF LINK-BASED PAYMENT
const qrData = getPaymentQRData(invoice.paymentInfo);
if (qrData) {
  try {
    const qrCode = await QRCode.toDataURL(qrData);
    doc.addImage(qrCode, "PNG", 120, pageHeight - 65, 40, 40);
  } catch (err) {
    console.log("QR code generation failed:", err);
  }
}
```

---

## TASK 4: WhatsApp Integration (30 min)

### Update shareInvoice.ts

Find WhatsApp message generation and add payment text:

```typescript
import { getPaymentInfoForWhatsApp } from "@/utils/paymentInfoUtils";

export function generateWhatsAppMessage(invoice: Invoice): string {
  const invoiceNumber = invoice.number || "N/A";
  const clientName = invoice.clientName || "Client";
  const amount = (invoice.total / 100).toFixed(2);
  const date = new Date(invoice.createdAt).toLocaleDateString();

  // ✅ GET PAYMENT INFO TEXT
  const paymentText = getPaymentInfoForWhatsApp(invoice.paymentInfo);

  // Build message
  const message = `
*Invoice #${invoiceNumber}*

Dear ${clientName},

Here's your invoice for services rendered.

*Invoice Details:*
Amount Due: $${amount}
Date: ${date}

${paymentText}

Please feel free to reach out if you have any questions.

Thank you!
  `.trim();

  return message;
}
```

### In InvoiceDetailScreen, use it like:

```typescript
const handleShareWhatsApp = async () => {
  const message = generateWhatsAppMessage(invoice);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  // Open WhatsApp
  Linking.openURL(whatsappUrl).catch(() => {
    Alert.alert("WhatsApp not installed");
  });
};
```

---

## TASK 5: Testing Checklist

### Test Scenario 1: Set Company Payment Info
```
1. Go to CompanyInfoScreen
2. Scroll to "Payment Information" section
3. Select "Bank Transfer" method
4. Fill in: Account # (12345678), Bank (Chase), Name (John Doe)
5. Click "Save Payment Information"
6. Close and reopen screen
✅ Should persist
```

### Test Scenario 2: Invoice Uses Company Default
```
1. Create new invoice
2. Get invoice via GET /api/invoices/:id
3. Check response includes paymentInfo object
4. Verify invoice PDF includes payment footer
5. Verify WhatsApp message includes payment
✅ Should show company default payment
```

### Test Scenario 3: Invoice Override
```
1. Create invoice (uses company default)
2. Edit invoice
3. Toggle "Use different payment for this invoice"
4. Select "PayPal" method
5. Enter PayPal link: https://paypal.me/myname
6. Save via PATCH /api/invoices/:id
7. Fetch invoice
8. Check PDF and WhatsApp
✅ Should show PayPal link + QR code (not company bank)
```

### Test Scenario 4: All Payment Methods
```
Test each method type:
- bank_transfer: Shows account, bank, name
- paypal: Shows link, QR code
- stripe: Shows link, QR code  
- square: Shows link, QR code
- mobile_money: Shows number + instructions
- custom: Shows just instructions text
✅ All should format correctly in PDF/WhatsApp
```

---

## CRITICAL IMPORTS TO ADD

### server/lib/paymentResolver.ts
```typescript
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { users, invoices } from "@shared/schema";
```

### client/utils/pdfGenerator.ts
```typescript
import { formatPaymentInfo, getPaymentQRData } from "@/utils/paymentInfoUtils";
import QRCode from "qrcode";
```

### client/utils/shareInvoice.ts
```typescript
import { getPaymentInfoForWhatsApp } from "@/utils/paymentInfoUtils";
```

---

## FILES TO UPDATE (Summary)

1. ✅ `client/screens/CompanyInfoScreen.tsx` - JSX added
2. ⏳ `server/lib/paymentResolver.ts` - CREATE NEW
3. ⏳ `server/invoices.ts` - Update GET & PATCH
4. ⏳ `client/utils/pdfGenerator.ts` - Add payment section
5. ⏳ `client/utils/shareInvoice.ts` - Add payment message

---

## READY TO DEPLOY AFTER

All remaining tasks + testing = **3-4 hours total**

Product will have:
- ✅ Company-level payment info (bank, PayPal, Stripe, Square, mobile, custom)
- ✅ Per-invoice override capability
- ✅ Payment info in PDF footer with QR codes for links
- ✅ Payment info in WhatsApp messages
- ✅ Type-safe payment resolution
- ✅ No payment processing (user's own info only)

Next developer: Start with server/lib/paymentResolver.ts (create file), then update invoice endpoints.
