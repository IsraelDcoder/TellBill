# 🚨 TellBill: Scope Proof & Client Approval Engine - Implementation Guide

## Feature Status: ✅ CORE INFRASTRUCTURE COMPLETE

### What's Built (Foundation)

#### 1️⃣ **Database Schema** (`migrations/0010_add_scope_proof_engine.sql`)
- ✅ `scope_proofs` table - main data storage
- ✅ `scope_proof_notifications` table - tracks reminder emails
- ✅ Indexes optimized for query performance
- ✅ Auto-update triggers for timestamps

#### 2️⃣ **Backend Routes** (`server/scopeProof.ts`)
- ✅ `GET /api/scope-proof` - List contractor's proofs (filtered)
- ✅ `POST /api/scope-proof` - Create manual scope proof
- ✅ `POST /api/scope-proof/:id/request` - Request client approval (sends email)
- ✅ `POST /api/scope-proof/approve/:token` - Client approves (no login needed)
- ✅ `POST /api/scope-proof/:id/resend` - Resend approval link
- ✅ `DELETE /api/scope-proof/:id` - Cancel approval request
- ✅ Subscription validation (free plan blocked)
- ✅ Token-based access control
- ✅ Auto-conversion to invoice line items on approval

#### 3️⃣ **Mobile UI** (`client/screens/ApprovalsScreen.tsx`)
- ✅ Tabbed interface (Pending, Approved, Expired)
- ✅ Status badges with visual indicators
- ✅ Photo grid display
- ✅ Cost breakdown
- ✅ Request approval modal
- ✅ Action buttons (Request, Resend, Cancel)
- ✅ Empty states with context
- ✅ Real-time store updates

#### 4️⃣ **Client Approval Web Page** (`client/public/approve.html`)
- ✅ No login required (token-based access only)
- ✅ Beautiful, professional UI
- ✅ Mobile responsive
- ✅ Shows work description, photos, cost
- ✅ Approve button with success state
- ✅ Question contact button
- ✅ Loading states and error handling

#### 5️⃣ **Zustand Store** (`client/stores/scopeProofStore.ts`)
- ✅ Fetch, create, request, resend, cancel operations
- ✅ Status filtering and counting
- ✅ Error handling and loading states
- ✅ Real-time UI updates

#### 6️⃣ **Navigation Integration** (`client/navigation/MainTabNavigator.tsx`)
- ✅ New "Approvals" tab added to main navigation
- ✅ Check-circle icon
- ✅ Properly typed in MainTabParamList

#### 7️⃣ **Route Registration** (`server/routes.ts`)
- ✅ Scope proof routes registered
- ✅ Auth and subscription middleware applied
- ✅ Static approval page route configured

---

## What Still Needs to Be Built

### 🔴 MEDIUM PRIORITY

#### 1. **AI Scope Detection** 
When contractor records voice note during voice-to-invoice flow:

**Location**: `server/transcription.ts`

**What to add**: After AI extraction, check for scope drift keywords:
- "also"
- "extra"
- "while I was there"
- "fixed another"
- "client asked"
- "additionally"
- "furthermore"

**Logic**:
```typescript
// After transcription
if (detectedScopeShift(transcript)) {
  // Extract additional work description
  const extraWork = await extractAdditionalWork(transcript, invoice);
  
  // Create scope proof card automatically
  await db.insert(scopeProofs).values({
    userId,
    projectId,
    description: extraWork.description,
    estimatedCost: extraWork.estimatedCost,
    photos: [], // Will be attached later
    status: 'pending',
    approvalToken: generateToken(),
    tokenExpiresAt: new Date(Date.now() + 24*60*60*1000),
  });
  
  // Notify contractor
  // "We detected extra work - review in Approvals tab"
}
```

#### 2. **Expiry & Reminder Logic**

**What to build**: 
- Cron job that runs every hour
- Finds scope proofs expiring in 12 hours
- Sends reminder email if not already sent
- Marks as expired after 24 hours

**Implementation**:
```typescript
// server/cron/scopeProofReminders.ts
async function checkPendingApprovals() {
  const now = new Date();
  const in12Hours = new Date(now.getTime() + 12*60*60*1000);
  
  // Find pending approvals expiring soon
  const expiringSoon = await db
    .select()
    .from(scopeProofs)
    .where(
      and(
        eq(scopeProofs.status, 'pending'),
        gte(scopeProofs.tokenExpiresAt, now),
        lte(scopeProofs.tokenExpiresAt, in12Hours)
      )
    );
  
  for (const proof of expiringSoon) {
    // Check if reminder already sent
    const reminderSent = await db
      .select()
      .from(scopeProofNotifications)
      .where(
        and(
          eq(scopeProofNotifications.scopeProofId, proof.id),
          eq(scopeProofNotifications.notificationType, 'reminder')
        )
      );
    
    if (reminderSent.length === 0) {
      // Send reminder email
      // Record notification
    }
  }
  
  // Mark expired
  const nowExpired = new Date();
  await db
    .update(scopeProofs)
    .set({ status: 'expired' })
    .where(
      and(
        eq(scopeProofs.status, 'pending'),
        lte(scopeProofs.tokenExpiresAt, nowExpired)
      )
    );
}
```

#### 3. **Photo Attachment to Scope Proofs**

**What to build**: When contractor creates manual scope proof, allow photo uploads

**Current UI**: Modal creates proof but no photo input
**Missing**: 
- Photo picker integration
- Upload to cloud storage (AWS S3 or similar)
- Photo URLs stored in JSON array

**Update ApprovalsScreen.tsx**:
```typescript
const handleCreateScopeProof = async (photos: string[]) => {
  // Upload photos to cloud
  const photoUrls = await uploadPhotos(photos);
  
  // Create scope proof with photo URLs
  await store.createScopeProof({
    projectId,
    description,
    estimatedCost,
    photos: photoUrls,
  });
};
```

#### 4. **Email Template Improvements**

**Current**: Basic text email
**Needed**: 
- HTML email with inline CSS
- Contractor branding options
- Invoice preview in email
- Logo/company info

**See**: `server/scopeProof.ts` lines ~135-150

---

### 🟡 LOW PRIORITY (NICE TO HAVE)

#### 1. **SMS/WhatsApp Notifications**
Instead of email-only, support SMS/WhatsApp for clients who don't check email

#### 2. **Bulk Approval Management**
Allow contractor to batch-send multiple approvals to same client

#### 3. **Approval Analytics Dashboard**
Show contractor:
- % approval rate
- Average time to approval
- Revenue from approved extras
- Common extra work types

#### 4. **Client Portal** (Future)
Clients could log in to see all their approvals across projects

---

## How to Test This Feature

### 1. **Database**
```bash
npm run db:push  # Apply migration 0010
```

### 2. **Contractor Flow**
1. Sign in to app
2. Navigate to new "Approvals" tab
3. Tap "Create Scope Proof" or see "Pending"
4. Fill in: description, cost, (photos when ready)
5. Tap "Request Approval"
6. Enter client email
7. Check success message

### 3. **Client Flow**
1. Contractor sends approval link
2. Client opens link in browser (no login needed)
3. See work description, photos, cost
4. Click "Approve"
5. Work added to invoice

### 4. **Invoice Integration**
1. After approval, check invoice
2. New line item should appear
3. Amount should match scope proof cost

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Token-based client access** | No login friction; instant approval |
| **24-hour expiry** | Creates urgency; prevents stale approvals |
| **12-hour reminder** | Balance between urgency and annoyance |
| **One-tap approval UI** | No negotiation; contractor controls scope |
| **Auto-invoice creation** | Money cannot be forgotten after approval |
| **Subscription lock** | Revenue-protect feature (paid plans only) |

---

## Critical Business Logic

### ✅ What Happens on Approval:
1. `scope_proofs.status` → "approved"
2. `scope_proofs.approved_at` → NOW
3. `scope_proofs.approved_by` → client email
4. Invoice line item created (if not exists)
5. Invoice total updated
6. Scope proof locked (immutable record)

### ✅ What Cannot Happen:
- Client cannot negotiate cost
- Client cannot edit scope
- Client cannot reject (force manual follow-up)
- Contractor cannot delete approved proof
- Approval cannot be reversed (immutable)

---

## Environment Setup

```bash
# Required env vars in .env.local
FRONTEND_URL=https://tellbill.app  # For approval link generation

# Email service (already configured)
SENDGRID_API_KEY=...
```

---

## Files Created/Modified

### New Files
- `migrations/0010_add_scope_proof_engine.sql` - Database schema
- `server/scopeProof.ts` - Backend routes
- `client/screens/ApprovalsScreen.tsx` - Mobile UI
- `client/stores/scopeProofStore.ts` - State management
- `client/public/approve.html` - Client approval page

### Modified Files
- `shared/schema.ts` - Added Drizzle ORM schema definitions
- `server/routes.ts` - Registered scope proof routes
- `client/navigation/MainTabNavigator.tsx` - Added Approvals tab

---

## Next Steps (In Order)

1. ✅ **Done**: Core infrastructure
2. 🔴 **TODO**: Add AI scope detection in transcription
3. 🔴 **TODO**: Add photo picker to mobile UI
4. 🔴 **TODO**: Setup expiry/reminder cron job
5. 🟡 **TODO**: Email template HTML improvements
6. 🟡 **TODO**: Add SMS notification option

---

## Success Criteria

When complete, contractors should:
- ✅ Fear NOT using the app (lost money anxiety)
- ✅ Get client approval in < 5 minutes
- ✅ Receive payment immediately after approval
- ✅ Have immutable proof of approved work
- ✅ Never forget scope-creep work again

---

## Questions to Clarify

1. Should we auto-add photos from VoiceRecordingScreen or require manual selection?
2. Should "Question" button email contractor or open support chat?
3. Should we show daily/weekly approval reminders to contractor?
4. Should expired proofs auto-archive or stay visible?
5. Should contractor get notified when client approves?

