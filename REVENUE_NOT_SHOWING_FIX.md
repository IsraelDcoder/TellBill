# Revenue Not Showing - Step-by-Step Verification & Fix

## Problem
- Revenue showing as $0.00 in HomeScreen and ProfileScreen
- Or revenue not loading at all
- Issue persists after marking invoices as paid

---

## Step 1: Verify Invoices Are In Database

### Check for Paid Invoices
```sql
-- Login to your database and run:
SELECT COUNT(*) as total_count,
       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
       SUM(CASE WHEN status = 'paid' THEN CAST(total as UNSIGNED) ELSE 0 END) as total_revenue_cents
FROM invoices 
WHERE userId = 'YOUR_USER_ID';
```

**Expected Result:**
```
total_count | paid_count | total_revenue_cents
-----------+-----------+---------------------
    5      |     2     |      15000
```

**If `paid_count` is 0:**
- Go to HomeScreen and create an invoice
- Set amount to $50.00
- Click the invoice → "Mark as Paid"
- Wait for toast success message
- Re-run query above

**If `total_revenue_cents` is 0 or NULL:**
- Check database type: Run `DESCRIBE invoices;`
- Verify `total` column is numeric (INT, BIGINT, DECIMAL)
- If not numeric, you'll need to migrate the column type

---

## Step 2: Verify Backend is Returning Data

### Test Backend API

**Using Terminal/Curl:**
```bash
# Get your auth token first from AsyncStorage or login response
TOKEN="your_token_here"

curl -X GET http://localhost:3000/api/data/all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Using Postman:**
1. Create new GET request to `http://localhost:3000/api/data/all`
2. Headers: 
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`
3. Send and check response

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "clientName": "ABC Construction",
        "total": 5000,
        "status": "paid",
        "createdAt": "2026-02-20T10:30:00Z",
        ...
      }
    ],
    "user": { ... },
    "company": { ... }
  }
}
```

**If empty `invoices` array:**
- Check backend logs: `grep -i "getInvoices\|SELECT.*invoices" server.log`
- Verify userId is being extracted correctly from token
- Check if user has permission to see invoices

**If 401/403 error:**
- Token is invalid or expired
- Re-login and get new token
- Verify `Authorization` header format: `Bearer TOKEN_HERE`

---

## Step 3: Verify Frontend is Fetching Data

### Check HomeScreen Logs

1. Open app to HomeScreen
2. Open DevTools:
   - **Expo Go:** Press Shift+M → select "D" for debug
   - **Web:** F12 → Console tab
3. Look for logs starting with `[Home]` or `[💰 Revenue]`

**Expected Logs:**
```
[Home] 🔄 Refetching invoices...
[Home] ✅ Loaded 2 invoices
[💰 Revenue Calc] Total invoices: 2, Paid: 1
[💰 Paid Invoice 1/1] Client: ABC Construction, Total: 5000 (type: number, in dollars: $50.00)
[✅ Added to revenue] New total: 5000 cents ($50.00)
[📊 FINAL REVENUE] Paid invoices: 1, Total revenue: 5000 cents ($50.00)
```

**If you see `[Home] ✅ Loaded 0 invoices`:**
- Backend is not returning data
- Go back to Step 2 and verify API

**If you see no `[Home]` logs:**
- HomeScreen is not triggering refetch
- The `useFocusEffect` hook is missing or broken
- Add/verify this code in HomeScreen (line ~55-80):

```tsx
useFocusEffect(
  React.useCallback(() => {
    const refetchInvoices = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token) return;

        const backendUrl = getApiUrl("/api/data/all");
        const response = await fetch(backendUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.invoices) {
            console.log(`[Home] ✅ Loaded ${data.data.invoices.length} invoices`);
            const hydrateInvoices = useInvoiceStore.getState().hydrateInvoices;
            const parsedInvoices = data.data.invoices.map((inv: any) => ({
              ...inv,
              items: typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : inv.items || [],
            }));
            hydrateInvoices(parsedInvoices);
          }
        }
      } catch (error) {
        console.error("[Home] Error refetching:", error);
      }
    };

    refetchInvoices();
  }, [])
);
```

---

## Step 4: Verify Store State in Console

### Run in Browser Console

Once HomeScreen has loaded (you should see `[Home] ✅ Loaded` logs):

```javascript
// Access the store
const store = useInvoiceStore.getState();

// Check all invoices
console.log('All invoices:', store.invoices.map(i => ({
  client: i.clientName,
  total: i.total,
  status: i.status
})));

// Check stats
const stats = store.getStats();
console.log('Stats:', {
  sent: stats.sent,
  paid: stats.paid,
  revenue: stats.revenue,
  timeSaved: stats.timeSaved
});

// Format the revenue
const { formatCurrency } = require('@/utils/formatCurrency');
console.log('Formatted Revenue:', formatCurrency(stats.revenue));
```

**Expected Output:**
```
All invoices: [
  { client: "ABC Construction", total: 5000, status: "paid" }
]

Stats: {
  sent: 0,
  paid: 1,
  revenue: 5000,
  timeSaved: 0.5
}

Formatted Revenue: $50.00
```

**If revenue is 0:**
- No paid invoices in store
- Go back to Step 1 and verify database

**If revenue shows but display still shows $0.00:**
- Go to Step 5

---

## Step 5: Verify Display is Updating

### Check KPI Card Rendering

1. In HomeScreen, scroll to KPI Cards section
2. You should see:
   - "Invoices Sent" card (left top)
   - "Invoices Paid" card (right top)
   - "Total Revenue" card (left bottom) ← **This is what we're checking**
   - "Time Saved" card (right bottom)

3. Check "Total Revenue" card value

**If showing $0.00 but logs show correct revenue:**
- Go to [client/screens/HomeScreen.tsx](client/screens/HomeScreen.tsx) line ~144
- Verify this code:
```tsx
<KPICard
  title="Total Revenue"
  value={formatCurrency(stats.revenue)}
  icon="dollar-sign"
  trend={{ value: 15, isPositive: true }}
/>
```

- If different, replace with code above
- **Common issue:** Using wrong variable - check it's `stats.revenue` not `stats.paid` or something else

4. If code looks correct, force app reload:
   - Close and reopen app
   - Clear cache: Expo Go → Settings → Clear Cache
   - Or full app reinstall

---

## Step 6: Check ProfileScreen Display

### Verify Revenue Shows There Too

1. Navigate to Profile screen
2. Scroll down to stats card
3. Look for "Revenue Generated" field (bottom section)

**Expected**: Should show same revenue as HomeScreen (or formatted like $X.XK if > $1000)

**If showing different values:**
- Another calculation issue
- Check [client/screens/ProfileScreen.tsx](client/screens/ProfileScreen.tsx) around line 150-170 for calculation logic
- Make sure it uses same `getStats()` function

**Code to verify in ProfileScreen:**
```tsx
// Around line 150-170, should have:
const stats = getStats(); // ← This calls store.getStats()
const revenueInCents = stats.revenue;
const revenueInDollars = revenueInCents / 100;

// Then formatting:
let formattedRevenue: string;
if (revenueInDollars >= 1000) {
  formattedRevenue = `$${(revenueInDollars / 1000).toFixed(1)}K`;
} else {
  formattedRevenue = formatCurrency(revenueInCents);
}
```

---

## Step 7: Fix Any Remaining Issues

### Issue: Shows $0.00 but database has paid invoices

**Cause:** Invoice totals are stored in DOLLARS, not CENTS

**Fix:**
In [client/stores/invoiceStore.ts](client/stores/invoiceStore.ts) around line 125-145, the code already has this:

```typescript
// If total < 100 and not zero, assume it's in dollars
if (invoiceTotal > 0 && invoiceTotal < 100) {
  console.warn(`[⚠️  POSSIBLY IN DOLLARS] Invoice total: ${invoiceTotal}`);
  invoiceTotal = invoiceTotal * 100;  // ← Converts to cents
}
```

But maybe it's not working. **Add more verbose logging:**

```typescript
// In getStats() function, replace the existing revenue calculation with:
let revenue = 0;
const paidInvoices = invoices.filter((i) => i.status === "paid");

paidInvoices.forEach((inv, idx) => {
  let total = inv.total || 0;
  console.log(`[DEBUG] Invoice ${idx + 1}: raw total = ${total}, type = ${typeof total}`);
  
  // Ensure it's a number
  total = typeof total === 'number' ? total : parseFloat(total) || 0;
  console.log(`[DEBUG] After parse: total = ${total}`);
  
  // If looks like dollars (small number), convert to cents
  if (total > 0 && total < 100) {
    console.log(`[DEBUG] Converting ${total} from dollars to cents`);
    total = total * 100;
  }
  
  revenue += total;
  console.log(`[DEBUG] Running total: ${revenue}`);
});

console.log(`[Final] Calculated revenue: ${revenue} cents ($${(revenue/100).toFixed(2)})`);
```

Then check logs to see where the issue is.

### Issue: Database shows paid invoices but frontend still shows $0.00

**Cause:** Invoice data not reaching frontend OR cache not cleared

**Full Reset:**
1. Close app completely
2. **iOS:** Delete app from simulator/device
3. **Android:** Clear app data
4. Reinstall app
5. Log back in
6. Check revenue

---

## Final Verification Checklist

- [ ] Database has paid invoices
  - Run `SELECT COUNT(*) FROM invoices WHERE status='paid' AND userId='YOUR_ID'`
  - Should return > 0

- [ ] Backend API returns invoices
  - Call `/api/data/all` endpoint
  - Response should have invoices array with items

- [ ] Frontend fetches data
  - Check logs for `[Home] ✅ Loaded X invoices`
  - Should appear when HomeScreen loads

- [ ] Store has data
  - Run `useInvoiceStore.getState().invoices.length` in console
  - Should be > 0

- [ ] Stats calculates correctly
  - Run `useInvoiceStore.getState().getStats()` in console
  - `revenue` should be > 0

- [ ] Display shows revenue
  - "Total Revenue" KPI card shows formatted amount
  - ProfileScreen shows revenue "Generated"

---

## Getting Help

If still stuck:

1. **Collect Debug Info:**
```javascript
// In browser console, run:
const store = useInvoiceStore.getState();
const stats = store.getStats();
console.table({
  totalInvoices: store.invoices.length,
  paidCount: stats.paid,
  revenueInCents: stats.revenue,
  formattedDisplay: require('@/utils/formatCurrency').formatCurrency(stats.revenue),
  sampleInvoice: store.invoices[0]
});
```

2. **Check Backend Logs:**
```bash
# If running locally
tail -f server.log | grep -i "revenue\|invoices\|data/all"
```

3. **Share:**
   - Console output
   - Backend logs
   - Database query results
   - A screenshot of:
     - HomeScreen showing KPI cards
     - DevTools console with logs

