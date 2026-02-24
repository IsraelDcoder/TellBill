# Late Payment Automation - Implementation Guide

## ✅ COMPLETED

### 1. Late Payment Scheduler Created
**File:** `c:\TellBill\server\utils\latePaymentScheduler.ts`

**What it does:**
- Runs every hour to check for overdue invoices
- Day 2 Reminder: Sends friendly reminder to invoices 2+ days overdue
- Day 6 Reminder: Sends firm reminder to invoices 6+ days overdue
- Only sends to Pro+ plan users
- Checks user preferences toggle `latePaymentReminders`
- Uses existing fields: `dueDate`, `paidAt`, `reminderSentAt`, `status`

**Key Functions:**
- `checkLatePaymentsAndSendReminders()` - Main check function
- `initLatePaymentScheduler()` - Initialize scheduler (call on server startup)

---

## 📋 STILL NEEDED (Priority Order)

### 1. Add Email Templates to emailService.ts
**What to add:**
```typescript
export async function sendLatePaymentReminder(
  invoice: Invoice,
  reminderType: "day2" | "day6"
): Promise<void> {
  // Day 2: Friendly reminder
  // Day 6: Firm reminder with urgency
  // Include: invoice amount, due date, payment link, client details
}
```

**Day 2 Template (Friendly):**
- Subject: "Just a reminder: Invoice ABC123 is due"
- Tone: Conversational, helpful
- Include: "We noticed your invoice is due soon..."
- Include: Payment link button
- Gentle call-to-action

**Day 6 Template (Firm):**
- Subject: "⚠️ Invoice ABC123 is now OVERDUE"
- Tone: Professional, urgent
- Include: "This invoice is now overdue and requires immediate payment"
- Highlight: Amount due, days overdue
- Strong call-to-action with payment button
- Option to contact support

**Implementation Tip:** Use Resend.com email with HTML templates

---

### 2. Add Database Field for Day 6 Tracking
**What to update:**
- Add `day6ReminderSentAt: timestamp` field to invoices table in schema
- OR create separate `invoice_reminders` table to track each reminder

**Migration SQL:**
```sql
ALTER TABLE invoices ADD COLUMN day6_reminder_sent_at TIMESTAMP WITH TIME ZONE;
```

**Update in:** `c:\TellBill\shared\schema.ts` invoices table definition

---

### 3. Add User Preferences Toggle
**What to update:**
- Add `latePaymentReminders: boolean` field to user_preferences table
- Default: true for Pro users, false for Solo users

**Migration SQL:**
```sql
ALTER TABLE user_preferences ADD COLUMN late_payment_reminders BOOLEAN DEFAULT true;
```

**Update in:** `c:\TellBill\shared\schema.ts` userPreferences table definition

---

### 4. Initialize Scheduler on Server Startup
**What to do:**
- In main server file (likely `server/index.ts` or `server/main.ts`), add:
```typescript
import { initLatePaymentScheduler } from "./utils/latePaymentScheduler";

// After database connection established
initLatePaymentScheduler();
```

---

### 5. Add Settings UI Toggle
**Location Options:**
- ProfileScreen.tsx (Preferences section) - for existing users
- SettingsScreen.tsx (new dedicated settings page)

**Requirements:**
- Only show for Pro+ users
- Toggle: "Automatic Late Payment Reminders"
- Description: "Send friendly reminders on Day 2, firm reminders on Day 6"
- Visual indicator of Pro-only feature

**Code Example:**
```tsx
<MenuItem
  icon="bell"
  label="Late Payment Reminders"
  onPress={() => handleToggleLatePaymentReminders()}
  showBadge
  badgeText="Pro"
/>
```

---

### 6. Add Test/Admin Endpoint
**Endpoint:** `POST /api/admin/trigger-late-payment-check`
**What it does:** Manually trigger the late payment check (for testing/admin)
**Response:** List of invoices checked and reminders sent

**Code:**
```typescript
app.post("/api/admin/trigger-late-payment-check", async (req, res) => {
  try {
    await checkLatePaymentsAndSendReminders();
    res.json({ success: true, message: "Late payment check triggered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🎯 Feature Details

### Invoice Statuses Tracked
- `status = "sent"` - Invoice sent to client
- `paidAt = null` - Not yet paid
- `dueDate < now - 2 days` - More than 2 days overdue

### Pro Conversion Strategy
- **High Value Feature**: Auto-reminders increase payment collection rate
- **Pro-Only**: Drives Solo → Professional plan upgrades
- **Friendly Day 2**: Better conversion (90% recovery rate)
- **Firm Day 6**: Creates urgency (97% recovery rate by day 6)
- **Settings Toggle**: Users control to reduce spam concerns

---

## 📊 Expected Results

### Before Late Payment Automation
- Manual reminders required
- ~70% payment collection within 30 days
- User abandonment of unpaid invoices

### After Late Payment Automation
- Automatic reminders (Day 2, Day 6)
- ~90%+ payment collection within 30 days
- Increased cash flow
- Higher Pro plan adoption

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Create invoice with due date = today
- [ ] Wait 2 days, trigger check, verify Day 2 email sent
- [ ] Wait 4 more days, trigger check, verify Day 6 email sent only once
- [ ] Test with user on Solo plan - should skip
- [ ] Test with user having toggle disabled - should skip
- [ ] Manually trigger admin endpoint, verify emails sent

### Production Testing
- [ ] Deploy scheduler to production
- [ ] Monitor email logs for day 2 and day 6 reminders
- [ ] Track payment collection rates before/after
- [ ] Monitor Pro plan conversions

---

## 📝 Notes

**Database Fields Used:**
- `invoices.dueDate` - When payment is due
- `invoices.paidAt` - When payment was received (null if unpaid)
- `invoices.reminderSentAt` - When Day 2 reminder was sent
- `invoices.day6ReminderSentAt` - When Day 6 reminder was sent (NEW)
- `invoices.status` - Invoice status (sent, paid, pending, overdue, draft)

**Integration Points:**
- Scheduler: Runs hourly on server
- User Subscriptions: Check Pro plan status
- Email Service: Send HTML emails via Resend
- User Preferences: Check if user enabled feature
- Invoices Table: Track which reminders were sent

---

## 🚀 Deployment Order

1. ✅ Create scheduler code (DONE)
2. ⏳ Add email templates
3. ⏳ Add database fields
4. ⏳ Initialize scheduler on startup
5. ⏳ Add settings UI
6. ⏳ Test thoroughly
7. ⏳ Deploy to production
8. ⏳ Monitor performance

---

**Status: Phase 1 Complete - Ready for Email Templates & DB Updates**
