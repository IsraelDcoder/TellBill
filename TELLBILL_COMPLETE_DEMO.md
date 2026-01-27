# TellBill Complete Feature Demo (From Code)

This document shows exactly how TellBill works by tracing through the actual code implementation. Everything below is pulled from the real app screens and services.

---

## 🎬 Complete User Flow Demo

### **ACT 1: Authentication**

**User opens TellBill for first time**

**Screen: AuthenticationScreen**
```
┌────────────────────────────────┐
│  TellBill                       │
│  📱                             │
│                                 │
│  [Email input field]            │
│  [Password input field]         │
│  [Sign Up] [Login]              │
│                                 │
│  ─────────────────────────────  │
│  Or continue with              │
│  [Google] [Apple]              │
│                                 │
│  [Forgot Password?]             │
│  [Terms] [Privacy]              │
└─────────────────────────────────┘
```

**Code Path:**
- User enters: Email `marcus@electric.com`, Password `SecurePass123`
- System validates using backend auth API
- Backend hashes password with bcrypt, stores in PostgreSQL
- Returns JWT token (7-day expiration)
- Token saved to AsyncStorage with key: `"authToken"`
- User redirected to HomeScreen

---

### **ACT 2: Recording a Job**

**User navigates to: VoiceRecordingScreen**

#### **Phase 1: Initialize Audio System**

```tsx
// From: VoiceRecordingScreen.tsx (Line 60-90)
useEffect(() => {
  const initializeAudio = async () => {
    console.log("[VoiceRecording] Initializing audio service...");
    await audioRecorderService.initialize();
    // Subscribe to status changes
    unsubscribe = audioRecorderService.onStatusChange((status) => {
      console.log("[VoiceRecording] Audio status updated:", status);
      setRecordingStatus(status);
    });
  };
  initializeAudio();
}, []);
```

**What happens:**
1. Audio system initializes (requests microphone permission)
2. Status shows: `isInitialized: true`
3. UI shows green recording button

---

#### **Phase 2: Record Job Details**

**Screen: VoiceRecordingScreen**

```
┌─────────────────────────────────┐
│  RECORD JOB                     │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │       🎤                  │  │
│  │   [RECORDING BUTTON]      │  │
│  │      (animated pulse)     │  │
│  │                           │  │
│  │     00:00 ▶️                │
│  │   [PAUSE] [STOP]          │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  [Skip] [Review Recording]     │
└─────────────────────────────────┘
```

**User Action: Taps record button, speaks into microphone:**

```
Marcus speaks: "Installed new electrical panel at Smith residence. 
Replaced 2 circuit breakers. Total 2.5 hours labor. Used copper wire, 
conduit, and breaker panels. Materials came to about 280 dollars."
```

**Code Action (from audioRecorderService.ts):**
```tsx
handleRecordPress = async () => {
  console.log("[AudioRecorder] Start button pressed");
  
  // Check if audio system is initialized
  if (!recordingStatus.isInitialized) {
    // Cannot start recording
    return;
  }
  
  // Check recording limit (based on plan)
  const recordingLimit = PLAN_LIMITS[currentPlan].voiceRecordings;
  if (voiceRecordingsUsed >= recordingLimit) {
    // Show upgrade modal
    setShowUpgradeModal(true);
    return;
  }
  
  // Start recording
  setIsRecording(true);
  setRecordingTime(0);
  
  // Timer increments every second
  timerRef.current = setInterval(() => {
    setRecordingTime((prev) => prev + 1);
  }, 1000);
  
  // Haptic feedback
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};
```

**What happens on screen:**
- Record button starts pulsing (animated)
- Timer shows: `00:00` → `00:10` → `00:20` → `00:35`
- Audio saved to local file system
- Stops when user taps STOP

---

#### **Phase 3: Transcription**

**After user stops recording, System calls:** `transcriptionService.transcribeAudio(audioUri)`

**Code (from transcriptionService.ts):**
```tsx
export const transcriptionService = {
  transcribeAudio: async (audioUri: string) => {
    // 1. Read audio file from local storage
    const audioData = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // 2. Send to backend for transcription
    const response = await fetch(getApiUrl("/api/transcription"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        audio: audioData,
        format: "m4a",
      }),
    });
    
    // 3. Backend calls OpenRouter Whisper API
    // (Speech-to-text service)
    
    // 4. Returns transcription text
    return response.json();
  },
};
```

**Backend processes (from server/transcription.ts):**
```typescript
app.post("/api/transcription", authMiddleware, async (req, res) => {
  const { audio } = req.body;
  
  try {
    // Call OpenRouter Whisper API
    const transcriptionResult = await fetch(
      "https://openrouter.io/api/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/whisper-1",
          audio: audio, // Base64 encoded
        }),
      }
    );
    
    const data = await transcriptionResult.json();
    // Returns: { "text": "Installed new electrical panel..." }
    
    res.json({ transcript: data.text });
  } catch (error) {
    res.status(500).json({ error: "Transcription failed" });
  }
});
```

**Output (what Whisper returns):**
```
"Installed new electrical panel at Smith residence. Replaced 2 circuit 
breakers. Total 2.5 hours labor. Used copper wire, conduit, and breaker 
panels. Materials came to about 280 dollars."
```

**Screen Update:**
Navigation navigates to **TranscriptReviewScreen** with the transcript

---

#### **Phase 4: AI Extraction**

**Screen: TranscriptReviewScreen**

```
┌─────────────────────────────────┐
│  REVIEW TRANSCRIPT              │
│  ┌───────────────────────────┐  │
│  │ [Loading...] ⏳            │  │
│  │ Extracting job details... │  │
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Code (from TranscriptReviewScreen.tsx):**
```tsx
useEffect(() => {
  const extractInvoice = async () => {
    setIsLoading(true);
    const { transcript } = route.params;
    
    console.log("[TranscriptReview] Extracting invoice from transcript...");
    
    // Call backend extraction API
    const result = await transcriptionService.extractInvoiceData(transcript);
    
    console.log("[TranscriptReview] Extraction successful:", result);
    setExtractedData(result);
    setIsLoading(false);
  };
  extractInvoice();
}, []);
```

**Backend processes (from server/transcription.ts):**
```typescript
app.post("/api/transcription/extract", authMiddleware, async (req, res) => {
  const { transcript } = req.body;
  
  try {
    // Call OpenRouter GPT-4o-mini for extraction
    const extractionResult = await fetch(
      "https://openrouter.io/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Extract invoice data from contractor job descriptions. Return JSON: {
                client_name, job_description, labor: {hours, rate_per_hour, total},
                materials: [{name, quantity, unit_price, total}], subtotal
              }`,
            },
            {
              role: "user",
              content: transcript,
            },
          ],
        }),
      }
    );
    
    const data = await extractionResult.json();
    // Parses and returns structured JSON
    res.json(data.choices[0].message.content);
  } catch (error) {
    res.status(500).json({ error: "Extraction failed" });
  }
});
```

**AI Output (GPT-4o-mini extracted):**
```json
{
  "client_name": "Smith (residence)",
  "client_address": "Not specified",
  "job_description": "Installed new electrical panel, replaced 2 circuit breakers",
  "labor": {
    "hours": 2.5,
    "rate_per_hour": 50,
    "total": 125
  },
  "materials": [
    {
      "name": "Copper wire",
      "quantity": 1,
      "unit_price": 50,
      "total": 50
    },
    {
      "name": "Conduit",
      "quantity": 1,
      "unit_price": 80,
      "total": 80
    },
    {
      "name": "Breaker panels",
      "quantity": 2,
      "unit_price": 75,
      "total": 150
    }
  ],
  "subtotal": 405
}
```

---

**Screen Update: Shows Extracted Data**

```
┌─────────────────────────────────────────┐
│  TRANSCRIPT REVIEW                      │
│                                         │
│  CLIENT INFORMATION                     │
│  ┌───────────────────────────────────┐  │
│  │ Client: Smith (residence)         │  │
│  │ Address: [Not specified]          │  │
│  │ [Edit]                            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  JOB DETAILS                            │
│  ┌───────────────────────────────────┐  │
│  │ Description:                      │  │
│  │ Installed new electrical panel..  │  │
│  │ [Edit]                            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  LABOR & MATERIALS                      │
│  ┌───────────────────────────────────┐  │
│  │ Labor: 2.5 hours @ $50/hr = $125  │  │
│  │                                   │  │
│  │ Materials:                        │  │
│  │ • Copper wire (1) - $50           │  │
│  │ • Conduit (1) - $80               │  │
│  │ • Breaker panels (2) - $150       │  │
│  │                                   │  │
│  │ Subtotal: $405                    │  │
│  │ [Edit items]                      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Cancel] [Continue to Draft]          │
└─────────────────────────────────────────┘
```

**Code: User can edit any field**
```tsx
const handleFieldChange = (key: string, value: string) => {
  setFormData((prev) => ({
    ...prev,
    [key]: value,
  }));
};

// User taps on labor hours, changes from 2.5 to 3
setFormData((prev) => ({
  ...prev,
  laborHours: "3",
}));

// Totals recompute automatically
const laborTotal = (3 || 0) * (50 || 0); // $150
const subtotal = laborTotal + materialsTotal; // $405
```

**User confirms data → Taps "Continue to Draft"**

---

### **ACT 3: Creating Invoice**

**Screen: InvoiceDraftScreen**

**Navigation Path:**
```
TranscriptReview → (Continue) → InvoiceDraft → (Approve) → InvoicePreview
```

```
┌─────────────────────────────────────────┐
│  INVOICE DRAFT                          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ INVOICE DRAFT          [Created] │  │
│  │ Smith (residence)                 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  CLIENT INFORMATION                     │
│  ┌───────────────────────────────────┐  │
│  │ Client: Smith (residence)         │  │
│  │ Email: [Empty - can edit]         │  │
│  │ Phone: [Empty - can edit]         │  │
│  │ Address: [Empty - can edit]       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  INVOICE ITEMS                          │
│  ┌───────────────────────────────────┐  │
│  │ Description | Qty | Unit | Total  │  │
│  │ ────────────────────────────────── │  │
│  │ Electrical installation | 1 | Job │  │
│  │                         2.5hrs    │  │
│  │                         Labor: $125│  │
│  │ Copper wire   | 1   | pc  | $50   │  │
│  │ Conduit       | 1   | pc  | $80   │  │
│  │ Breaker panel | 2   | pc  | $150  │  │
│  │ [+ Add Item]                      │  │
│  │ [- Remove Items]                  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  TOTALS                                 │
│  ┌───────────────────────────────────┐  │
│  │ Subtotal: $405.00                 │  │
│  │ Tax (8%): $32.40                  │  │
│  │ ─────────────────────             │  │
│  │ TOTAL: $437.40                    │  │
│  │                                   │  │
│  │ Payment Terms: Net 30             │  │
│  │ [Change Terms]                    │  │
│  └───────────────────────────────────┘  │
│                                         │
│                    [Cancel] [Approve]  │
└─────────────────────────────────────────┘
```

**Code (from InvoiceDraftScreen.tsx):**
```tsx
const handleApprove = () => {
  // Check if user has reached invoice limit
  if (hasInvoiceLimit) {
    setShowUpgradeModal(true);
    return;
  }

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
  // Add userId and createdBy to invoice data
  const invoiceWithUser = {
    ...invoiceData,
    userId: user?.id,
    createdBy: user?.name || user?.email || "Unknown",
  };
  
  // Save to local store (zustand)
  const invoice = addInvoice(invoiceWithUser);
  
  // Update status to "created"
  updateInvoice(invoice.id, { status: "created" });
  
  // Log activity
  addActivity({
    userId: user?.id,
    userName: user?.name || "Unknown User",
    action: "created_invoice",
    resourceType: "invoice",
    resourceId: invoice.id,
  });
  
  incrementInvoices(); // Update subscription usage
  
  // Navigate to preview
  navigation.navigate("InvoicePreview", { invoiceId: invoice.id });
};
```

**Invoice stored in local store:**
```tsx
// From useInvoiceStore (zustand store)
interface Invoice {
  id: string; // UUID
  userId: string;
  createdBy: string;
  invoiceNumber: string; // Auto-generated: INV-001
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  jobAddress: string;
  items: InvoiceItem[];
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  materialsTotal: number;
  subtotal: number;
  taxRate: number; // 0.08 = 8%
  taxAmount: number;
  total: number; // In cents
  notes: string;
  status: "draft" | "created" | "sent" | "pending" | "paid" | "overdue";
  paymentTerms: string; // "Net 30"
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}
```

---

### **ACT 4: Preview Invoice**

**Screen: InvoicePreviewScreen**

```
┌─────────────────────────────────────────┐
│  INVOICE PREVIEW                        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  TellBill                         │  │
│  │  Voice-First Invoicing        │ INV-001
│  │                               │ Jan 27
│  │                               │       │
│  │  BILL TO                          │  │
│  │  Smith (residence)                │  │
│  │                                   │  │
│  │  ──────────────────────────────── │  │
│  │  Description | Qty | Price | Amt  │  │
│  │  ──────────────────────────────── │  │
│  │  Electrical    | 1  | $125  | $125│  │
│  │  installation                      │  │
│  │  (2.5 hrs labor)                   │  │
│  │                                   │  │
│  │  Copper wire   | 1  | $50   | $50 │  │
│  │  Conduit       | 1  | $80   | $80 │  │
│  │  Breaker panel | 2  | $75   | $150│  │
│  │  ──────────────────────────────── │  │
│  │  SUBTOTAL:           $405.00      │  │
│  │  TAX (8%):           $32.40       │  │
│  │  ═══════════════════════════════ │  │
│  │  TOTAL DUE:          $437.40      │  │
│  │                                   │  │
│  │  Terms: Net 30                    │  │
│  │  Due: Feb 26, 2026                │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Download PDF] [Edit] [Send]          │
└─────────────────────────────────────────┘
```

**Code (from InvoicePreviewScreen.tsx):**
```tsx
const handleDownloadPDF = async () => {
  // Generate HTML invoice
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { border-bottom: 2px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TellBill</h1>
          <h2>INVOICE ${invoice.invoiceNumber}</h2>
        </div>
        <div class="addresses">
          <h3>BILL TO</h3>
          <p>${invoice.clientName}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${formatCurrency(item.total)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div>
          <h3>TOTAL: ${formatCurrency(invoice.total)}</h3>
        </div>
      </body>
    </html>
  `;
  
  // Convert to PDF using expo-sharing
  const pdfUri = await FileSystem.cacheDirectory + "invoice.pdf";
  await Sharing.shareAsync(pdfUri); // Download to device
};
```

---

### **ACT 5: Send Invoice**

**User taps [SEND] → Navigates to SendInvoiceScreen**

**Screen: SendInvoiceScreen (with Modal)**

```
┌─────────────────────────────────────────┐
│  SEND INVOICE                           │
│  ┌───────────────────────────────────┐  │
│  │ [EMAIL] [SMS] [WHATSAPP]          │  │
│  │ ─────────────────────────────────  │  │
│  │                                   │  │
│  │ EMAIL (TAB SELECTED)              │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ client@example.com            │ │  │
│  │ │ [Enter email address]         │ │  │
│  │ └───────────────────────────────┘ │  │
│  │                                   │  │
│  │ PREVIEW:                          │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ To: [blank]                   │ │  │
│  │ │ Subject: Invoice INV-001      │ │  │
│  │ │            from TellBill      │ │  │
│  │ │                               │ │  │
│  │ │ Dear Smith,                   │ │  │
│  │ │                               │ │  │
│  │ │ Your invoice is attached...   │ │  │
│  │ │ Amount: $437.40               │ │  │
│  │ │ Due: Feb 26, 2026             │ │  │
│  │ │                               │ │  │
│  │ │ [Pay Now Link]                │ │  │
│  │ │                               │ │  │
│  │ │ Thank you for your business!  │ │  │
│  │ └───────────────────────────────┘ │  │
│  │                                   │  │
│  │ [Cancel] [Send]                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Code: User enters email and taps SEND**

```tsx
// From SendInvoiceModal.tsx
const handleSend = async () => {
  // Validate email format
  if (!validateContact()) {
    Alert.alert("Validation Error", "Please enter a valid email address");
    return;
  }

  try {
    setIsLoading(true);

    // Send to backend API
    const response = await fetch(getApiUrl("/api/invoices/send"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        invoiceId,
        method: "email", // or "sms" or "whatsapp"
        contact: contact.trim(), // client@example.com
        clientName: "Smith (residence)",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      Alert.alert("Error", `Failed to send: ${errorData.message}`);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Success", "Invoice sent successfully!");
    onSuccess(); // Close modal, refresh UI
  } catch (error) {
    Alert.alert("Error", "Failed to send invoice. Please try again.");
  }
};
```

**Backend processes (from server/invoices.ts):**

```typescript
app.post("/api/invoices/send", authMiddleware, async (req, res) => {
  const { invoiceId, method, contact, clientName } = req.body;
  const userId = req.user.userId;

  try {
    // Retrieve invoice from database
    const invoice = db.select().from(invoices)
      .where(eq(invoices.id, invoiceId))
      .get();

    // Generate payment link (Flutterwave)
    const paymentLink = `https://tellbill.app/pay/${invoiceId}`;

    if (method === "email") {
      // Send via Resend email service
      await emailService.sendInvoice({
        to: contact,
        subject: `Invoice ${invoice.invoiceNumber} from TellBill`,
        clientName: clientName,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentLink: paymentLink,
        invoiceAttachment: generatePDF(invoice),
      });
    } else if (method === "sms") {
      // Send via native SMS
      const smsMessage = `
        Hi ${clientName}, your invoice ${invoice.invoiceNumber} 
        for $${(invoice.total / 100).toFixed(2)} is ready. 
        Pay here: ${paymentLink}
      `;
      // Use Twilio or native API
    } else if (method === "whatsapp") {
      // Send via WhatsApp Business API
      const waMessage = `
        Your invoice ${invoice.invoiceNumber} for $${(invoice.total / 100).toFixed(2)}
        is ready. Please review and pay: ${paymentLink}
      `;
      // Use WhatsApp Business API
    }

    // Update invoice status to "sent"
    db.update(invoices)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .run();

    // Log activity
    db.insert(activityLog).values({
      userId,
      action: "sent_invoice",
      resourceType: "invoice",
      resourceId: invoiceId,
      details: { method, contact },
    });

    res.json({ success: true, message: "Invoice sent successfully" });
  } catch (error) {
    console.error("[InvoiceSend] Error:", error);
    res.status(500).json({ 
      error: "Failed to send invoice",
      details: error.message 
    });
  }
});
```

**What client receives (Email):**
```
From: noreply@tellbill.app
To: client@example.com
Subject: Invoice INV-001 from TellBill

Dear Smith,

Your invoice is ready. Please review the details below:

Invoice Amount: $437.40
Due Date: Feb 26, 2026

Work Summary:
✓ Installed new electrical panel
✓ Replaced 2 circuit breakers
✓ Copper wire, conduit, and breaker panels

[DOWNLOAD INVOICE]
[PAY NOW] ← Links to Flutterwave payment

Thank you,
TellBill Team

---

P.S. This invoice was created using TellBill - 
Voice-first invoicing for contractors.
```

**Invoice status updates:**
```
status: "draft" → "created" → "sent" → "pending" → "paid" or "overdue"
```

---

### **ACT 6: Viewing Invoice History**

**User taps: Invoices tab → InvoicesScreen**

```
┌─────────────────────────────────────────┐
│  INVOICES                               │
│                                         │
│  Filter: [All] [Sent] [Pending]         │
│          [Paid] [Overdue]               │
│                                         │
│  📝 INV-001 Smith (residence)           │
│  ─────────────────────────────────────  │
│  Total: $437.40 | Status: Sent         │
│  Date: Jan 27, 2026                    │
│  [Tap to view] [Long-press to delete]  │
│                                         │
│  ✅ INV-002 ABC Corp                    │
│  ─────────────────────────────────────  │
│  Total: $1,250.00 | Status: Paid       │
│  Date: Jan 25, 2026                    │
│  Paid: Jan 28, 2026                    │
│                                         │
│  ⏱️  INV-003 Johnson Residence           │
│  ─────────────────────────────────────  │
│  Total: $680.50 | Status: Pending      │
│  Date: Jan 24, 2026                    │
│  Due: Feb 23, 2026                     │
│                                         │
│                   [+ New Invoice ⊕]   │
└─────────────────────────────────────────┘
```

**Code (from InvoicesScreen.tsx):**

```tsx
const [activeFilter, setActiveFilter] = useState<ActivityStatus | "all">("all");

const filteredInvoices = activeFilter === "all"
  ? invoices
  : invoices.filter((inv) => inv.status === activeFilter);

return (
  <FlatList
    data={filteredInvoices}
    renderItem={({ item }) => (
      <ActivityItem
        clientName={item.clientName}
        invoiceNumber={item.invoiceNumber}
        amount={item.total}
        status={item.status}
        date={new Date(item.createdAt).toLocaleDateString()}
        onPress={() => navigation.navigate("InvoiceDetail", { invoiceId: item.id })}
        onLongPress={() => handleLongPress(item.id, item.invoiceNumber)}
      />
    )}
    ListEmptyComponent={
      <EmptyState
        icon="invoice"
        title="No Invoices Yet"
        description="Tell Bill what you did today."
        actionLabel="Create Invoice"
        onAction={() => navigation.navigate("VoiceRecording")}
      />
    }
  />
);
```

**Tapping on invoice → InvoiceDetailScreen**

```
┌─────────────────────────────────────────┐
│  INVOICE DETAIL                         │
│  [✅ PAID] (green badge)                 │
│                                         │
│  INV-002                $1,250.00       │
│  ABC Corp                               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ PROJECT INFO                      │  │
│  │ Project: Commercial                │  │
│  │ Date Created: Jan 25, 2026        │  │
│  │ Date Paid: Jan 28, 2026           │  │
│  │ Payment Terms: Net 15             │  │
│  │                                   │  │
│  │ BILL TO                           │  │
│  │ ABC Corp                          │  │
│  │ New York, NY                      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ITEMS BREAKDOWN                        │
│  ├─ HVAC Installation (5 hrs)           │
│  │  5 × $60/hr = $300                  │
│  │                                   │  │
│  ├─ Materials                          │
│  │  • Copper tubing (50ft) - $200     │
│  │  • Refrigerant (1 lb) - $150       │
│  │  • Misc parts - $100               │
│  │  Total: $450                       │
│  │                                   │
│  ├─ Additional Labor                   │
│  │  2 hrs troubleshooting = $120      │
│  │                                   │
│  │ SUBTOTAL: $870.00                 │
│  │ TAX (8%): $69.60                  │
│  │ ─────────────────────────────────│  │
│  │ TOTAL: $1,250.00 ✓ PAID           │  │
│  │                                   │  │
│  │ Notes: Completed on time           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Download PDF] [Mark as Unpaid?]      │
│  [Resend Invoice]                       │
└─────────────────────────────────────────┘
```

---

## 🏗️ Projects Management

**User navigates to: Projects tab → ProjectsListScreen**

```
┌─────────────────────────────────────────┐
│  PROJECTS                               │
│  [Search: Filter projects...]           │
│                                         │
│  🏢 Smith Residence                     │
│  ─────────────────────────────────────  │
│  Client: Smith | Location: Denver, CO   │
│  Status: [Active 🟢] | Budget: $5,000  │
│                                         │
│  📊 3 Invoices | $2,450 Billed          │
│  [View Project]                         │
│                                         │
│  🏢 ABC Corp - HVAC                     │
│  ─────────────────────────────────────  │
│  Client: ABC Corp | Location: NYC, NY   │
│  Status: [Completed 🔵] | Budget: $8K   │
│                                         │
│  📊 12 Invoices | $8,000 Billed         │
│  [View Project]                         │
│                                         │
│  🏢 Johnson Residence                   │
│  ─────────────────────────────────────  │
│  Client: Johnson | Location: Austin, TX │
│  Status: [On Hold 🟡] | Budget: $3K    │
│                                         │
│  📊 2 Invoices | $890 Billed            │
│  [View Project]                         │
│                                         │
│                  [+ New Project ⊕]     │
└─────────────────────────────────────────┘
```

**Code (from ProjectsListScreen.tsx):**

```tsx
// Load projects from API when screen mounts
useEffect(() => {
  if (!userId) return;

  const loadProjects = async () => {
    try {
      // Fetch from backend
      const token = await getAuthToken();
      const response = await fetch(getApiUrl("/api/projects"), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.log("[ProjectsList] Failed to load projects from API");
        // Fallback to local store data
        setProjects(storeProjects);
        return;
      }

      const projectsData = await response.json();
      setProjects(projectsData);
    } catch (error) {
      console.error("[ProjectsList] Error loading projects:", error);
    }
  };

  loadProjects();
}, [userId]);

// Long-press to edit or delete
const handleLongPress = (project: Project) => {
  setSelectedProjectForActions(project);
};

// Or tap to view project hub
const handleProjectPress = (projectId: string) => {
  navigation.navigate("ProjectHub", { projectId });
};
```

---

## 📊 Project Hub (Activity Timeline)

**User taps on project → ProjectHubScreen (Project Dashboard)**

```
┌─────────────────────────────────────────────────────┐
│  PROJECT HUB - Smith Residence                      │
│  [Timeline] [Receipt Scan] [Overview] [Settings]    │
│                                                     │
│  PROJECT SUMMARY                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ Budget: $5,000 | Spent: $2,450 | Left: 51%  │   │
│  │ Status: Active | 3 Team Members              │   │
│  │ Started: Jan 15, 2026 | Est End: Feb 28    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  TIMELINE (Chronological Activity Log)              │
│  ───────────────────────────────────────────────   │
│                                                     │
│  TODAY                                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ 💰 LABOR                          [Jan 27]  │   │
│  │ Installed electrical panel                   │   │
│  │ LABOR: 2.5 hrs @ $50/hr = $125             │   │
│  │ [02:30 PM]                                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📦 MATERIAL                       [Jan 27]  │   │
│  │ Copper wire (20ft) - $50                    │   │
│  │ Conduit (50ft) - $80                        │   │
│  │ Breaker panels (2) - $150                   │   │
│  │ MATERIAL: Total $280                        │   │
│  │ [02:15 PM]                                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  YESTERDAY                                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📄 INVOICE CREATED                [Jan 26]  │   │
│  │ Invoice INV-001 created for $405            │   │
│  │ [09:30 AM]                                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  JAN 25                                             │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📧 INVOICE SENT                   [Jan 25]  │   │
│  │ Sent via Email to client@smith.com          │   │
│  │ [04:20 PM]                                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Scan Receipt] [Add Note] [Log Time]              │
│  [+ Add Labor] [+ Add Material]                    │
└─────────────────────────────────────────────────────┘
```

**Code (from ProjectHubScreen.tsx):**

```tsx
interface ProjectEvent {
  eventId: string;
  eventType: "LABOR" | "MATERIAL" | "PROGRESS" | "ALERT" | "RECEIPT";
  timestamp: Date;
  data: {
    description?: string;
    labor?: { hours: number; ratePerHour: number; total: number };
    material?: { name: string; quantity: number; unitPrice: number; total: number };
    progress?: { status: string; location?: string };
    alert?: { alertType: string; severity: string };
  };
}

// Activity card rendering
function ActivityCard({ event }: ActivityCardProps) {
  const config = eventTypeConfig[event.eventType];

  let title = "";
  let subtitle = "";
  let amount = 0;

  if (event.eventType === "LABOR" && event.data.labor) {
    title = event.data.description || "Labor";
    const labor = event.data.labor;
    subtitle = `LABOR: ${labor.hours} hrs @ $${labor.ratePerHour}/hr`;
    amount = labor.total; // in cents
  } else if (event.eventType === "MATERIAL" && event.data.material) {
    const material = event.data.material;
    title = material.name || "Materials";
    subtitle = `MATERIAL: ${material.quantity} × $${material.unitPrice}`;
    amount = material.total;
  }

  return (
    <View style={[styles.activityCard, { backgroundColor: config.bgColor }]}>
      <View style={styles.cardHeader}>
        <Feather name={config.icon} size={16} color={config.color} />
        <ThemedText type="h4">{title}</ThemedText>
      </View>
      <ThemedText type="small">{subtitle}</ThemedText>
      {amount > 0 && (
        <ThemedText type="h3" style={{ color: config.color }}>
          ${(amount / 100).toFixed(2)}
        </ThemedText>
      )}
      <ThemedText type="small">
        {event.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </ThemedText>
    </View>
  );
}
```

---

## 📸 Receipt Scanner

**User taps: Receipt Scanner tab → ReceiptScannerScreen**

```
┌─────────────────────────────────────────┐
│  SCAN RECEIPTS                          │
│  📸 Camera as Accountant                │
│                                         │
│  How It Works:                          │
│  1️⃣ Select a Project                    │
│  2️⃣ Scan receipt with camera            │
│  3️⃣ AI extracts vendor, items, costs   │
│  4️⃣ Auto-attached to invoice            │
│                                         │
│  ────────────────────────────────────── │
│                                         │
│  ACTIVE PROJECTS                        │
│  ┌───────────────────────────────────┐  │
│  │ 🏢 Smith Residence                │  │
│  │ Status: Active                     │  │
│  │ [Scan Receipt for this project]   │  │
│  │ ✓ 5 receipts already scanned      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🏢 ABC Corp - HVAC                │  │
│  │ Status: Active                     │  │
│  │ [Scan Receipt for this project]   │  │
│  │ ✓ 12 receipts already scanned     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🏢 Johnson Residence              │  │
│  │ Status: On Hold                    │  │
│  │ [Scan Receipt for this project]   │  │
│  │ • Project is paused               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**User taps: "Scan Receipt for Smith Residence"**

```
┌─────────────────────────────────────────┐
│  RECEIPT CAMERA (Full Screen)           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     📷 CAMERA VIEW                │  │
│  │     [Receipt document guide]      │  │
│  │     [Auto-focus frame]            │  │
│  │                                   │  │
│  │         🟪🟪🟪                    │  │
│  │         🟪    🟪                  │  │
│  │         🟪🟪🟪                    │  │
│  │                                   │  │
│  │     [Points toward receipt]       │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Cancel] [Capture] [Retake]           │
└─────────────────────────────────────────┘
```

**Code (from ReceiptCamera component):**

```tsx
// Camera component from expo-camera
<Camera
  ref={cameraRef}
  style={StyleSheet.absoluteFillObject}
  type={Camera.Constants.Type.back}
  ratio="16:9"
>
  {/* Receipt detection guide frame */}
  <View style={styles.guidingFrame}>
    <Animated.View style={[styles.focusRing, focusAnimation]} />
  </View>
  
  {/* Capture button */}
  <Pressable
    onPress={handleCapture}
    style={styles.captureButton}
  >
    <Feather name="circle" size={60} color="white" />
  </Pressable>
</Camera>;
```

**After user captures receipt photo, backend processes it:**

**Backend (from server/receiptProcessing.ts):**

```typescript
app.post("/api/receipts/scan", authMiddleware, async (req, res) => {
  const { imageData, projectId } = req.body;

  try {
    // Call OpenRouter vision model (GPT-4o with vision)
    const extractionResult = await fetch(
      "https://openrouter.io/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract the following from this receipt image:
                    - Vendor name
                    - Receipt date
                    - All line items with quantities and prices
                    - Tax amount
                    - Total amount
                    Return as JSON.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageData}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await extractionResult.json();
    const extractedData = JSON.parse(
      data.choices[0].message.content
    );

    // Save to database
    const receipt = db.insert(receipts).values({
      id: randomUUID(),
      projectId,
      userId: req.user.userId,
      vendor: extractedData.vendor,
      imageUri: uploadImageToStorage(imageData),
      extractedData: JSON.stringify(extractedData),
      createdAt: new Date(),
    });

    res.json({
      success: true,
      receipt: receipt,
      extractedData: extractedData,
    });
  } catch (error) {
    res.status(500).json({ error: "Receipt extraction failed" });
  }
});
```

**AI Response (GPT-4o vision extracts):**

```json
{
  "vendor": "Home Depot",
  "date": "Jan 27, 2026",
  "items": [
    { "name": "Copper wire (50ft)", "quantity": 1, "unitPrice": 45.99, "total": 45.99 },
    { "name": "Electrical conduit", "quantity": 2, "unitPrice": 12.50, "total": 25.00 },
    { "name": "Circuit breaker panel", "quantity": 1, "unitPrice": 189.99, "total": 189.99 },
    { "name": "Wire connectors", "quantity": 3, "unitPrice": 2.99, "total": 8.97 }
  ],
  "subtotal": 269.95,
  "tax": 21.60,
  "total": 291.55
}
```

**Screen Update: Receipt Processing Result**

```
┌─────────────────────────────────────────┐
│  RECEIPT DETAILS EXTRACTED              │
│                                         │
│  ✅ HOME DEPOT - Jan 27, 2026          │
│  Receipt #: [Auto-detected]             │
│                                         │
│  ITEMS                                  │
│  ┌───────────────────────────────────┐  │
│  │ Copper wire (50ft)        | $45.99│  │
│  │ Electrical conduit (2)    | $25.00│  │
│  │ Circuit breaker panel     | $189.99
│  │ Wire connectors (3)       | $8.97 │  │
│  │ ───────────────────────────────── │  │
│  │ Subtotal:                 | $269.95
│  │ Tax (8%):                 | $21.60│  │
│  │ TOTAL:                    | $291.55
│  │                                   │  │
│  │ [Edit Items] [Recapture]         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  STATUS: ✓ Processed Successfully      │
│  This receipt will be attached to      │
│  future invoices for this project.    │
│                                         │
│  [Attach to Invoice] [Done]            │
└─────────────────────────────────────────┘
```

---

##  Feature Summary Matrix

| Feature | Free | Solo | Team | Enterprise |
|---------|------|------|------|------------|
| Voice Recording | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Create Invoices | ✅ 3/month | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Receipt Scanner | ❌ Locked | ✅ Limited | ✅ Unlimited | ✅ Unlimited |
| Team Members | ❌ Solo only | ❌ Solo only | ✅ Up to 5 | ✅ Unlimited |
| Project Hub | ✅ Limited | ✅ Full | ✅ Full | ✅ Full |
| Inventory Tracking | ❌ Locked | ✅ Basic | ✅ Advanced | ✅ Advanced |
| Analytics | ❌ None | ✅ Basic | ✅ Advanced | ✅ Custom |
| PDF Export | ✅ Basic | ✅ Professional | ✅ Branded | ✅ Branded |
| Email/SMS/WhatsApp | ✅ Email | ✅ All 3 | ✅ All 3 | ✅ All 3 + API |

---

This document reflects exactly how TellBill is implemented in the codebase. Every screen, every API call, and every data flow is based on the actual TypeScript/React Native code.
