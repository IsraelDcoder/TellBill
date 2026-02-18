# Critical Money Bug Fix - $100x Multiplication Error

## Bug Description
Amounts were being multiplied by 100 twice, causing:
- $3,600 to display as $360,000  
- $2,002 to display as $200,200
- All amounts off by factor of 100

## Root Cause Analysis

### The Bug Chain:
1. **Client** (TranscriptReviewScreen.tsx, lines 342-343):
   - Correctly converts amounts to cents: `Math.round(value * 100)`
   - Sends: laborRate, laborTotal, materialsTotal, items all in CENTS
   
2. **Server** (invoices.ts, lines 716-720) - ❌ THE BUG:
   ```typescript
   const laborTotalCents = Math.round(laborHours * laborRate * 100);  // ❌ laborRate already cents!
   const materialsTotalCents = Math.round(materialsTotal * 100);      // ❌ already cents!
   const itemsTotalCents = Math.round(items.reduce(...) * 100);       // ❌ already cents!
   ```
   - These multiply by 100 AGAIN when input is already in cents
   - Example: `10 * 3600 * 100 = 3,600,000 cents` instead of `10 * 3600 = 36,000 cents`

3. **Database** stores the 100x multiplied value

4. **Display** divides by 100, showing wrong amount

## The Fix

### 1. **Created: `lib/money.ts`** - Central Money Utilities
```typescript
// ✅ Convert dollars → cents
toMinorUnits(20.02) // → 2002

// ✅ Convert cents → dollars  
toMajorUnits(2002) // → 20.02

// ✅ PRIMARY FORMATTING FUNCTION (use everywhere)
formatCents(360000) // → "$3,600.00"

// ✅ Calculate labor total WITHOUT extra multiplication
calculateLaborTotal(hours, rateInCents) // → hours * rateInCents (NO *100)

// ✅ Calculate tax and total
calculateTotalWithTax(subtotalCents, taxRatePercent)
```

### 2. **Fixed: `server/invoices.ts` line 716-720**
**Before:**
```typescript
const laborTotalCents = Math.round(laborHours * laborRate * 100);  // ❌ WRONG
const materialsTotalCents = Math.round(materialsTotal * 100);      // ❌ WRONG
const itemsTotalCents = Math.round(items.reduce(...) * 100);       // ❌ WRONG
```

**After:**
```typescript
const laborTotalCents = Math.round(laborHours * laborRate);        // ✅ CORRECT
const materialsTotalCents = Math.round(materialsTotal);            // ✅ CORRECT
const itemsTotalCents = Math.round(items.reduce(...));             // ✅ CORRECT
```

### 3. **Created: `lib/money.test.ts`** - Comprehensive Test Suite
Tests covering:
- ✅ 360000 cents displays as "$3,600.00" (NOT "$360,000.00")
- ✅ 2002 cents displays as "$20.02" (NOT "$200,200.00")
- ✅ Labor calculation: 100 hours @ $36/hr = $3,600 (NOT $360,000)
- ✅ Tax calculations
- ✅ Edge cases (null, undefined, invalid strings)
- ✅ Regression tests for the original bug

## Currency Rule (Now Enforced)
- **All amounts are integers representing CENTS**
- Client sends amounts in cents
- Server stores amounts in cents  
- Display divides by 100 and formats
- Never multiply by 100 on server if already in cents

## Files Changed
1. **Created:** `lib/money.ts` - Central money utilities
2. **Created:** `lib/money.test.ts` - Comprehensive test suite
3. **Fixed:** `server/invoices.ts` - Removed double multiplication
4. **Documentation:** This file

## Files Using Currency (Already Correct)
- `client/utils/formatCurrency.ts` - Already divides by 100 correctly
- `client/screens/InvoiceDraftScreen.tsx` - Uses formatCurrency
- `client/screens/InvoiceDetailScreen.tsx` - Uses formatCurrency
- `client/screens/InvoicePreviewScreen.tsx` - Uses formatCurrency
- All other screens - Use formatCurrency correctly

## Verification
✅ **TypeScript:** Zero compilation errors
✅ **Tests:** All passing
✅ **Logic:** Single rule enforced: amounts in cents, divide by 100 for display

## Example Flow After Fix
**User enters:** Labor rate = "$36/hr", Works 100 hours
1. Client converts to cents: 3600 cents (OK)
2. Client calculates: 100 * 3600 = 360000 cents (OK)
3. Server receives: laborRate=3600, laborHours=100
4. Server calculates: 100 * 3600 = 360000 cents (✅ FIXED - no extra *100)
5. Server stores: 360000 cents in DB
6. Display: formatCents(360000) = "$3,600.00" (✅ CORRECT)

## Next Steps
1. **Test on device:** Verify invoice totals display correctly
2. **Monitor:** Check for any remaining 100x multiplication errors
3. **Migrate:** Update any hard-coded formatting to use money utilities
