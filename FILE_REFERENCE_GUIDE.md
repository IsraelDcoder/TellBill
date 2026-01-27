# Scope Proof Engine - File Reference Guide

## Quick Navigation

### 📋 Documentation Files
- **PHASE3_COMPLETION_SUMMARY.md** - Executive summary of all Phase 3 work
- **SCOPE_PROOF_COMPLETE_SETUP.md** - Complete setup guide with config
- **SCOPE_PROOF_IMPLEMENTATION.md** - Original feature documentation  
- **SCOPE_PROOF_PHASE3_COMPLETE.md** - Detailed Phase 3 breakdown
- **IMPLEMENTATION_CHECKLIST.md** - QA & deployment checklist (this file)

---

## Feature Files (What Was Built)

### Backend Services (server/)

#### 1. AI Scope Drift Detection
📄 **File**: `server/utils/scopeDriftDetection.ts`
- **Purpose**: Automatically detect when contractors mention extra work
- **Key Functions**:
  - `analyzeScopeDrift(transcript)` - Main detection function
  - `detectScopeDrift(transcript)` - Returns confidence + indicators
  - `extractExtraWorkDescription(transcript)` - Get relevant sentences
  - `estimateExtraWorkCost(transcript)` - Heuristic pricing
- **Size**: ~200 lines
- **Integration**: Called from `server/transcription.ts`
- **Dependencies**: TypeScript, no external APIs

#### 2. Expiry & Reminder Scheduler  
📄 **File**: `server/utils/scopeProofScheduler.ts`
- **Purpose**: Send reminders, mark expired approvals
- **Key Functions**:
  - `checkScopeProofReminders()` - Main scheduler logic
  - `initScopeProofScheduler()` - Initialize on startup
  - `generateReminderEmail()` - 12h reminder template
  - `generateExpiryEmail()` - 24h expiry template
- **Size**: ~400 lines
- **Integration**: Initialized in `server/index.ts`
- **Schedule**: Runs every 1 hour automatically
- **Dependencies**: Database, email service

#### 3. Multi-Channel Notifications
📄 **File**: `server/services/notificationService.ts`
- **Purpose**: Send notifications via email, SMS, WhatsApp
- **Key Classes**:
  - `NotificationService` - Main service class
  - Singleton instance exported
- **Key Methods**:
  - `send(payload)` - Send via any channel
  - `sendEmail(payload)` - Email notifications
  - `sendSMS(payload)` - SMS via Twilio
  - `sendWhatsApp(payload)` - WhatsApp via Twilio
- **Size**: ~400 lines
- **Integration**: Ready to use throughout app
- **Dependencies**: Twilio (optional), SendGrid

#### 4. HTML Email Templates
📄 **File**: `server/templates/scopeProofEmails.ts`
- **Purpose**: Professional branded emails
- **Templates**:
  - `generateApprovalRequestEmail()` - Send to contractor
  - `generateClientApprovalEmail()` - Send to client
  - `generateApprovalApprovedEmail()` - Send to contractor (approved)
  - `generateReminderEmail()` - 12h reminder
  - `generateExpiryEmail()` - 24h expiry
- **Size**: ~500 lines
- **Features**: Inline CSS, mobile responsive, TellBill branding
- **Dependencies**: None (pure HTML generation)

### Frontend Components (client/)

#### 5. Photo Picker Component
📄 **File**: `client/components/PhotoPicker.tsx`
- **Purpose**: Allow contractors to add photos as work proof
- **Key Component**: `<PhotoPicker />`
- **Features**:
  - Camera capture
  - Gallery selection
  - Multiple photos (max 5)
  - Individual removal
  - Upload progress
  - Cloud storage ready
- **Size**: ~250 lines
- **Props**:
  - `onPhotosSelected(photos)` - Callback with photo URIs
  - `maxPhotos` - Maximum photos allowed
  - `disabled` - Disable during submission
- **Dependencies**: expo-image-picker, React Native

### Integration Points

#### Modified: server/index.ts
```typescript
// Added imports
import { initScopeProofScheduler } from "./utils/scopeProofScheduler";

// Added in initialization
initScopeProofScheduler(); // Initialize hourly scheduler
```

#### Modified: server/transcription.ts  
```typescript
// Added imports
import { analyzeScopeDrift } from "./utils/scopeDriftDetection";

// Added in /api/extract-invoice endpoint
const scopeDrift = analyzeScopeDrift(transcript);
if (scopeDrift.detected && scopeDrift.confidence > 0.35) {
  // Auto-create scope proof
  // Return scopeDriftDetected object in response
}
```

---

## How to Use Each Component

### 1. AI Scope Drift Detection

**Import**:
```typescript
import { analyzeScopeDrift } from "./utils/scopeDriftDetection";
```

**Usage**:
```typescript
const result = analyzeScopeDrift("Also fixed the cabinet, 2 hours, $100 materials");
// Returns:
// {
//   detected: true,
//   confidence: 0.72,
//   indicators: ["also", "fixed", "hours", "cost"],
//   description: "Fixed the cabinet",
//   estimatedCost: 270,
//   reasoning: "..."
// }
```

**Customize Keywords**:
Edit `SCOPE_DRIFT_INDICATORS` object in `scopeDriftDetection.ts`

---

### 2. Scheduler (Automatic)

**What It Does**:
- Runs every hour automatically after server start
- Finds pending proofs expiring in ~12 hours
- Sends reminder email if not already sent
- Marks expired proofs
- Sends expiry notification

**No Action Required** - Works automatically once initialized

**Check Status**:
```bash
# Look for these logs:
# [ScopeProof] Initializing scheduler (runs every 1 hour)
# [ScopeProof] Running reminder check...
# [ScopeProof] Found X approvals expiring in 12 hours
```

---

### 3. Notifications Service

**Import**:
```typescript
import { 
  notificationService,
  notifyApprovalRequest,
  notifyApprovalApproved
} from "../services/notificationService";
```

**Send Single Notification**:
```typescript
await notificationService.send({
  channel: "email", // or "sms", "whatsapp"
  to: "user@example.com", // or phone number
  subject: "Your Approval",
  body: "Message content",
  html: "<p>HTML content</p>"
});
```

**Send Approval Request Notifications**:
```typescript
await notifyApprovalRequest({
  contractorEmail: "contractor@example.com",
  contractorPhone: "+14155552671", // Optional
  clientPhone: "+14155552671", // Optional
  workDescription: "Fixed cabinet",
  estimatedCost: 250,
  approvalUrl: "https://tellbill.app/approve/token",
  channels: ["email", "sms", "whatsapp"]
});
```

**Send Approval Confirmation**:
```typescript
await notifyApprovalApproved({
  contractorEmail: "contractor@example.com",
  contractorPhone: "+14155552671",
  workDescription: "Fixed cabinet",
  estimatedCost: 250,
  channels: ["email", "sms"]
});
```

---

### 4. Email Templates

**Import**:
```typescript
import { generateApprovalRequestEmail } from "../templates/scopeProofEmails";
```

**Generate Email HTML**:
```typescript
const html = generateApprovalRequestEmail({
  contractorName: "John Smith",
  workDescription: "Fixed kitchen cabinet",
  estimatedCost: 250,
  photoUrls: ["https://...jpg", "https://...jpg"],
  approvalUrl: "https://tellbill.app/approve/token123",
  expiresIn: 24,
  projectName: "Kitchen Remodel",
  clientEmail: "client@example.com"
});

// Use with SendGrid or any email service
await sendEmail({
  to: contractorEmail,
  subject: "Scope Proof Ready for Approval",
  html
});
```

---

### 5. Photo Picker Component

**Import**:
```typescript
import { PhotoPicker } from "@/components/PhotoPicker";
```

**Usage in Screen**:
```typescript
import { PhotoPicker } from "@/components/PhotoPicker";

export default function MyScreen() {
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <PhotoPicker
      onPhotosSelected={(urls) => setPhotos(urls)}
      maxPhotos={5}
      disabled={isSubmitting}
    />
  );
}
```

**Integrate with API Call**:
```typescript
const handleRequestApproval = async () => {
  const response = await fetch('/api/scope-proof/123/request', {
    method: 'POST',
    body: JSON.stringify({
      clientEmail,
      photos // Include photos
    })
  });
};
```

---

## Configuration Required

### Environment Variables

**For Email (Already Configured)**:
```env
SENDGRID_API_KEY=SG.xxxx...
```

**For SMS/WhatsApp (Optional but Recommended)**:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12025551234
```

**For Photo Upload to S3 (Production)**:
```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/K+bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=tellbill-photos
AWS_REGION=us-east-1
```

---

## Testing Examples

### Test AI Detection
```bash
curl -X POST http://localhost:3000/api/extract-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Did the main job. Also fixed the client'\''s cabinet while I was there. Took 2 hours, material cost $100."
  }'

# Expected response includes:
# "scopeDriftDetected": {
#   "detected": true,
#   "confidence": 0.72,
#   "description": "Fixed the client's cabinet while I was there",
#   "estimatedCost": 270
# }
```

### Test Email Template
```typescript
// In any Node.js script
import { generateApprovalRequestEmail } from "./server/templates/scopeProofEmails";

const html = generateApprovalRequestEmail({
  contractorName: "John",
  workDescription: "Cabinet repair",
  estimatedCost: 250,
  photoUrls: ["https://example.com/photo.jpg"],
  approvalUrl: "https://tellbill.app/approve/token",
  expiresIn: 24,
  projectName: "Home Remodel",
  clientEmail: "client@example.com"
});

console.log(html); // View HTML structure
```

### Test Scheduler (Manual)
```typescript
// In any Node.js script
import { checkScopeProofReminders } from "./server/utils/scopeProofScheduler";

await checkScopeProofReminders(); // Run once manually
```

---

## Troubleshooting

### Scope Drift Not Detected
- Check confidence threshold is 0.35 or lower
- Add custom keywords to SCOPE_DRIFT_INDICATORS
- Test with different transcript phrasing

### Emails Not Sending
- Verify SENDGRID_API_KEY in .env
- Check SendGrid integration in emailService.ts
- Look for errors in server logs

### Scheduler Not Running
- Verify `initScopeProofScheduler()` called in server/index.ts
- Check server logs for initialization message
- Verify database connection works

### SMS/WhatsApp Not Working
- Add Twilio credentials to .env
- Verify phone number format (E.164)
- Check Twilio account has SMS/WhatsApp enabled

---

## File Dependencies

```
scopeDriftDetection.ts
  ├── No external dependencies
  └── Used by: transcription.ts

scopeProofScheduler.ts
  ├── database (db.ts)
  ├── scopeProofs schema
  ├── scopeProofNotifications schema
  ├── sendEmail from emailService
  └── Used by: server/index.ts

notificationService.ts
  ├── twilio (optional)
  ├── sendEmail from emailService
  └── Used by: scope proof endpoints, scheduler

scopeProofEmails.ts
  ├── No external dependencies
  └── Used by: scopeProof.ts, scopeProofScheduler.ts, notificationService.ts

PhotoPicker.tsx
  ├── expo-image-picker
  ├── React Native components
  ├── Feather icons
  ├── Theme constants
  └── Used by: ApprovalsScreen (integration needed)

server/index.ts
  ├── Imports scopeProofScheduler
  └── Initializes on startup

server/transcription.ts
  ├── Imports scopeDriftDetection
  └── Calls analyzeScopeDrift() after extraction
```

---

## Performance Tips

1. **AI Detection**: Confidence threshold at 0.35 is good default. Lower if missing detections.
2. **Scheduler**: Runs every hour - acceptable for reminders. Lower to 30min if needed urgency.
3. **Photos**: Keep under 5MB per image for fast upload/download
4. **Emails**: Pre-generate HTML templates during build if possible
5. **Database**: Use provided indexes for scopeProofs queries

---

## Migration Path to Production

1. **Test Locally**
   - Start server locally
   - Test each component
   - Check logs for errors

2. **Deploy to Staging**
   - Run database migration
   - Deploy code
   - Test with staging data

3. **Configure Production**
   - Add Twilio credentials
   - Add S3 credentials
   - Update FRONTEND_URL env variable

4. **Deploy to Production**
   - Back up database
   - Run migration
   - Deploy code
   - Monitor error logs

5. **Enable Features Gradually**
   - Start with email only (SMS optional)
   - Monitor delivery rates
   - Enable SMS after 1 week
   - Enable WhatsApp after 2 weeks

---

## Support & Resources

- **Twilio Docs**: https://www.twilio.com/docs
- **SendGrid Docs**: https://sendgrid.com/docs
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3/
- **React Native**: https://reactnative.dev
- **Drizzle ORM**: https://orm.drizzle.team

---

**All Phase 3 features are now documented and ready for use! 🚀**
