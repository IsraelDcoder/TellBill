# Revenue Bug Diagnostic Guide

## Symptom
Revenue displays inconsistently between screens:
- HomeScreen shows one amount (e.g., $2,002)
- ProfileScreen shows a different amount (e.g., $360,000)
- Values flip between page refreshes

## Root Cause Analysis

### The 100x Multiplication Issue
If the revenue is ~100x too high, the issue is likely:

1. **Backend sending mixed formats** - Some invoices sent as dollars ($3600), others as cents (360000¢)
2. **Frontend double-converting** - Converting from dollars to cents twice
3. **Database storing inconsistently** - Some totals in dollars, some in cents

### Expected Data Format
- **Database**: All amounts stored as **CENTS** (integer)
- **API Response**: All amounts as **CENTS** (integer)  
- **Display**: Divide by 100 using `formatCents()`

Examples:
- $2,002.00 = 200200 cents
- $3,600.00 = 360000 cents
- $50.99 = 5099 cents

## Diagnostic Logs

When you open HomeScreen, check the console logs for:

```
[💰 Revenue Calc] Total invoices: X, Paid: Y
[💰 Paid Invoice 1/Y] Client: ClientName, Total: 200200 (type: number, in dollars: $2,002.00)
[✅ Added to revenue] New total: 200200 cents ($2,002.00)
[📊 FINAL REVENUE] Paid invoices: Y, Total revenue: 200200 cents ($2,002.00)
```

### Expected Log Pattern
- Each paid invoice should show a total in **cents** (4-6 digit number)
- When converted to dollars (divided by 100), should match invoice amount
- Final revenue should be sum of all paid invoices in cents

### RED FLAGS to Look For

**🚨 Suspiciously Large Total**
```
[⚠️  SUSPICIOUSLY LARGE] Invoice total: 36000000 cents ($360,000.00)
```
This happens when amounts are multiplied by 100 incorrectly.

**🚨 Possibly in Dollars**
```
[⚠️  POSSIBLY IN DOLLARS] Invoice total: 2002 (should be in cents, converting...)
```
This happens when backend sends dollars (2002) instead of cents (200200).

**🚨 Type Mismatch**
```
[💰 Paid Invoice 1/2] Client: ABC, Total: "200200" (type: string, ...)
```
If total is a STRING, it needs to be parsed to number first.

## How to Use Logs to Diagnose

1. **Open the app** and navigate to HomeScreen
2. **Open Developer Tools** (Expo Go → Shift+M → D)
3. **Look for logs starting with `[💰 Revenue Calc]`**
4. **For each paid invoice, note:**
   - Client name
   - Total amount they show
   - What it converts to in dollars
   - Any warnings about suspicious values

## Common Issues & Fixes

### Issue: All invoices show 100x values
**Symptom**: Invoice shows `total: 200200` but converts to `$2,002.00` (correct) or `total: 36000000` showing `$360,000.00` (wrong)
**Cause**: Backend multiplying by 100 when it shouldn't
**Fix**: Check `server/invoices.ts` POST endpoint to ensure:
```typescript
// ✅ CORRECT: Don't multiply by 100
const total = taxCalc.total;  // Already in cents

// ❌ WRONG: Would double-multiply
const total = taxCalc.total * 100;
```

### Issue: Invoices disappearing from revenue calculation
**Symptom**: HomeScreen shows fewer paid invoices than expected
**Cause**: Invoice status not correctly set to "paid"
**Fix**: Check InvoiceDetailScreen when marking as paid, ensure:
```typescript
paidAt: new Date().toISOString(),
status: "paid"  // Both must be set
```

### Issue: Revenue varies between HomeScreen and ProfileScreen  
**Symptom**: Different amounts on different screens
**Cause**: Different calculation logic or stale cache
**Fix**: Ensure both use:
```typescript
const paidInvoices = invoices.filter(i => i.status === "paid");
const revenue = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
```

## Testing the Fix

1. Create an invoice with a known amount (e.g., $50.00)
2. Check that `total` is stored as `5000` (cents) in database
3. Mark invoice as paid
4. Check HomeScreen revenue calculation logs
5. Verify final revenue matches sum of paid invoices

## Next Steps

1. Run the app and capture console logs
2. Attach logs to bug report showing all `[💰 Revenue]` messages
3. Note the pattern - are all amounts 100x too high? Or mixed?
4. Check database directly: `SELECT id, clientName, total FROM invoices WHERE status='paid';`
