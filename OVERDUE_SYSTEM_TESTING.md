# Overdue System - Complete Testing Guide

## System Overview
The Overdue system is automatic date-driven (not manual status). It triggers when:
- **Status** = "sent" 
- **Today** > **DueDate**
- **paidAt** = null (unpaid)

This triggers:
1. ✅ Visual red "X days overdue" badge on invoice cards
2. ✅ Day 1 notification email ("Invoice is now overdue")
3. ✅ Day 2 follow-up email (48 hours later, "Friendly reminder")
4. ✅ Day 6 firm email (6 days later, "Firm reminder")
5. ✅ Configurable frequency (1, 3, 7, 14 days between frequency-based reminders) - Pro feature

## Components Implemented

### 1. Frontend Utility Functions (`client/lib/invoiceUtils.ts`)
```typescript
isOverdue(invoice, now): boolean
getDaysOverdue(invoice, now): number
```
- Checks if invoice is past due date and not paid
- Calculates exact days overdue without database queries
- Real-time computation for UI updates

### 2. Email Notifications (`server/emailService.ts`)
- ✅ `sendDay1OverdueNotification(invoice)` - Single invoice
- ✅ `sendDay1OverdueNotifications()` - Batch query and send
  - Finds invoices 1+ days overdue with no Day 1 notification sent
  - Sends to all users with late payment reminders enabled
  - Professional HTML template with orange/red styling

### 3. Scheduler Integration (`server/jobs/latePaymentScheduler.ts`)
- ✅ Hourly scheduler (`checkLatePaymentsAndSendReminders`)
- ✅ Sequence: Day 1 → Day 2 (48h) → Day 6 (144h) → Day 6 (every 3 days by default)
- ✅ Calls: `sendDay1OverdueNotifications()` for initial trigger

### 4. Database Schema (`shared/schema.ts`)
- ✅ Added: `autoRemindFrequencyDays` to preferences table
- ✅ Type: `integer` with default value `3`
- ✅ Options: 1, 3, 7, or 14 days
- ✅ Migration: `migrations/0021_add_auto_remind_frequency.sql`

### 5. State Management (`client/stores/preferencesStore.ts`)
- ✅ State: `autoRemindFrequencyDays: number`
- ✅ Action: `setAutoRemindFrequency(days: number): void`
- ✅ Persistence: AsyncStorage via Zustand middleware
- ✅ Backend sync: Saves to preferences via PUT `/api/user/preferences`
- ✅ Loading: Extracts from backend response

### 6. UI Components

#### ProfileScreen - Preferences (`client/screens/ProfileScreen.tsx`)
- ✅ Late Payment Reminders toggle (Pro-only)
- ✅ Reminder Frequency picker (1d, 3d, 7d, 14d buttons)
- ✅ Pro feature only
- ✅ Connects to: `prefs.setAutoRemindFrequency(days)`

#### InvoicesScreen - Invoice List (`client/screens/InvoicesScreen.tsx`)
- ✅ Shows red "X days overdue" badge on invoice cards
- ✅ Uses: `isOverdue()` and `getDaysOverdue()` utilities
- ✅ Updates real-time as due dates pass
- ✅ Updated ActivityItem component with overdue display

#### InvoiceDetailScreen - Invoice Detail (`client/screens/InvoiceDetailScreen.tsx`)
- ✅ "Send Reminder" button appears when invoice is overdue
- ✅ Button shows: "Send Reminder (2d overdue)" format
- ✅ Red styling (#EF4444 color scheme) 
- ✅ Calls: `POST /api/invoices/:id/send-reminder`

### 7. Backend API Endpoint (`server/invoices.ts`)
- ✅ Route: `POST /api/invoices/:id/send-reminder`
- ✅ Auth: Requires authMiddleware
- ✅ Validation: Checks invoice ownership, overdue status
- ✅ Action: Calls `sendDay1OverdueNotification(invoice)`
- ✅ Response: `{ success: true, message: "Reminder sent successfully" }`

## Testing Scenario

### Test 1: Verify Automatic Overdue Detection
1. Create an invoice with due date = **tomorrow**
2. Send the invoice
3. Verify status icon shows "Sent" ✅
4. Manually update due date to **yesterday** in database (or wait)
5. Refresh app
6. Verify red "1 days overdue" badge appears on card ✅
7. Open invoice detail
8. Verify "Send Reminder" button appears ✅

### Test 2: Send Manual Reminder
1. With overdue invoice from Test 1
2. Tap "Send Reminder" button on invoice detail
3. Verify success alert "Reminder sent to client!" ✅
4. Check client email (should receive Day 1 template) ✅
5. Verify sender email matches emailService config ✅
6. Verify template shows "Invoice is Now Overdue" messaging ✅

### Test 3: Automatic Day 1 Notification (Scheduler)
1. Create invoice with due date = **yesterday**
2. Send invoice (status = "sent")
3. Wait for scheduler to run (hourly basis)
   - Manually trigger: POST to `/api/jobs/check-late-payments` with auth
4. Verify email sent automatically ✅
5. Check database for sent_day1_notification = true ✅

### Test 4: Day 2 Reminder (48 hours later)
1. From Test 3, invoice should have Day 1 reminder sent
2. Wait 48 hours or manually update database timer
3. Scheduler runs again
4. Verify Day 2 "Friendly reminder" email sent ✅
5. Subject different from Day 1 ✅

### Test 5: Day 6 Reminder (6 days later)
1. From Test 4, invoice aged another 4 days
2. Total age: 6+ days overdue
3. Scheduler runs
4. Verify Day 6 "Firm reminder" email sent ✅
5. Different tone/messaging from Day 1 and Day 2 ✅

### Test 6: Configure Auto-Remind Frequency
1. Go to Profile → Preferences (Pro account required)
2. Enable "Late Payment Reminders" toggle
3. Tap frequency button "7d"
4. Verify button turns gold/selected ✅
5. Go back and return to preferences
6. Verify "7d" is still selected ✅
7. Check app logs/backend: `autoRemindFrequencyDays = 7` saved ✅

### Test 7: Frequency-Based Reminders (After Day 6)
1. Invoice is 7+ days overdue
2. First Day 6 reminder sent at day 6
3. With frequency = 7 days, next reminder sends at day 6+7=13
4. At day 13, verify reminder sent (if Day 6 was sent) ✅
5. Change frequency to 3 days
6. New reminders should follow 3-day pattern from Day 6 ✅

### Test 8: Pro Feature Only
1. Switch to Free tier user
2. Go to Profile → Preferences
3. Verify "Late Payment Reminders" toggle is HIDDEN ✅
4. Verify frequency picker is HIDDEN ✅
5. Upgrade to Pro
6. Refresh app
7. Verify toggle and picker now VISIBLE ✅

### Test 9: Mark as Paid - Stops Reminders
1. Create and send invoice (due yesterday)
2. Wait for Day 1 reminder sent
3. "Mark as Paid" on invoice detail
4. Verify `paidAt` is set in database ✅
5. Verify invoice no longer shows red badge ✅
6. Wait for next scheduler run
7. Verify NO Day 2 reminder sent (isOverdue now false) ✅

### Test 10: Edge Cases
- **Multiple clients**: Each gets their own Day 1 notification ✅
- **Multiple invoices**: Each overdue invoice (independent) ✅
- **Email failures**: Graceful fallback, logged but doesn't block ✅
- **Frequency = 1d**: Reminders every 1 day after Day 6 ✅
- **Frequency = 14d**: Reminders every 14 days after Day 6 ✅

## Database Verification

### Check Migration Applied
```sql
-- Should return autoRemindFrequencyDays column
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'preferences' AND column_name = 'auto_remind_frequency_days';
```

### Check Preferences Data
```sql
-- Should show autoRemindFrequencyDays values (default 3)
SELECT id, user_id, auto_remind_frequency_days, late_payment_reminders 
FROM preferences 
LIMIT 5;
```

### Check Invoice Notification History
```sql
-- Should show Day 1 notifications sent
SELECT id, invoice_number, client_name, sent_day1_notification, created_at 
FROM invoices 
WHERE status = 'sent' AND paid_at IS NULL
LIMIT 10;
```

## Debugging

### Check Scheduler Logs
```bash
# In server logs, search for:
# "[Invoice] ✅ Reminder sent for invoice" - Manual send
# "[EmailService] Sending Day 1 overdue notification" - Scheduler send
# Watch hourly execution: "checkLatePaymentsAndSendReminders"
```

### Verify Email Config
```typescript
// Check emailService.ts has:
// - Resend client initialized
// - Day 1 template HTML correct
// - sendDay1OverdueNotification exported
```

### Check Frontend State
```typescript
// In Chrome DevTools console:
// Check preferencesStore state
const prefs = usePreferencesStore.getState();
console.log(prefs.autoRemindFrequencyDays); // Should be 1-14
console.log(prefs.latePaymentReminders); // Should be true/false
```

## Deployment Checklist

- [ ] Run migration: `0021_add_auto_remind_frequency.sql`
- [ ] Verify database column created
- [ ] Deploy server code (invoices.ts, emailService.ts, latePaymentScheduler.ts)
- [ ] Deploy client code (all screens, stores, utilities)
- [ ] Restart scheduler service
- [ ] Test Day 1 email delivery
- [ ] Monitor scheduler logs for first hourly run
- [ ] Verify UI shows overdue badges
- [ ] Test Send Reminder button
- [ ] Confirm Pro users see frequency picker

## Rollback Plan

If issues occur:
1. **Email template issues**: Update emailService.ts sendDay1OverdueNotification function
2. **Scheduler not running**: Check latePaymentScheduler.ts import and function call
3. **UI not showing badges**: Check ActivityItem.tsx and invoiceUtils.ts imports
4. **Database errors**: Check migration syntax and column data type
5. **State not persisting**: Check preferencesStore.ts AsyncStorage middleware

## Future Enhancements

- [ ] Add "snooze reminder" per invoice (postpone next reminder X days)
- [ ] Add "stop reminders" per customer (don't send reminders to this client)
- [ ] Analytics dashboard: Track reminder open rates, payment conversion post-reminder
- [ ] A/B test: Different reminder messages, measure payment speed
- [ ] Calendar view: Show upcoming reminders per invoice
- [ ] Batch operations: Select multiple invoices, send reminders all at once
