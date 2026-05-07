export const PLAN_LIMITS = {
  // 🟢 FREE — Trial Only
  free: {
    voiceRecordings: 3, // lifetime limit
    invoices: 3, // lifetime limit
    features: {
      // ✅ Included
      voiceRecording: true,
      basicInvoicing: true,
      emailInvoiceDelivery: true,
      // ❌ Hard limits
      projects: false,
      receiptScanning: false,
      scopeProof: false,
      clientApprovals: false,
      invoiceAutoUpdates: false,
      paymentTracking: false,
      reminders: false,
      whatsappDelivery: false,
      advancedAnalytics: false,
      apiAccess: false,
      teamManagement: false,
      customBranding: false,
    },
  },
  // 🔵 SOLO — Get Organized
  solo: {
    voiceRecordings: Infinity,
    invoices: Infinity,
    features: {
      // ✅ Included
      voiceRecording: true,
      basicInvoicing: true,
      emailInvoiceDelivery: true,
      projects: true, // manual creation
      receiptScanning: true,
      paymentTracking: true,
      whatsappDelivery: true,
      invoiceHistory: true,
      // ❌ Still locked
      scopeProof: false,
      clientApprovals: false,
      approvalReminders: false,
      autoAddApprovedWork: false,
      teamManagement: false,
      advancedAnalytics: false,
      apiAccess: false,
      customBranding: false,
    },
  },
  // 🟡 PROFESSIONAL — Protect Your Money (⭐ MOST POPULAR)
  professional: {
    voiceRecordings: Infinity,
    invoices: Infinity,
    projects: Infinity, // unlimited
    features: {
      // ✅ Everything in Solo +
      voiceRecording: true,
      basicInvoicing: true,
      emailInvoiceDelivery: true,
      projects: true,
      receiptScanning: true,
      paymentTracking: true,
      whatsappDelivery: true,
      invoiceHistory: true,
      // ✅ NEW in Professional
      scopeProof: true,
      clientApprovals: true,
      autoAddApprovedWork: true,
      photoProofWithTimestamps: true,
      approvalReminders: true,
      disputeReadyLogs: true,
      unlimitedProjects: true,
      // ❌ Not in this tier
      teamManagement: false,
      advancedAnalytics: false,
      apiAccess: false,
      customBranding: false,
      dedicatedSupport: false,
    },
  },

};

export const PRICING_TIERS = [
  // 🟢 FREE — Trial Only
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    badge: "Trial Only",
    description: "Let them feel the magic, then cut it off",
    copy: "This works… but I can't run my business like this.",
    features: [
      "✅ 3 voice recordings (lifetime)",
      "✅ 3 invoices (lifetime)",
      "✅ Basic invoice creation",
      "✅ Email invoice delivery",
      "❌ No projects",
      "❌ No receipt scanning",
      "❌ No client approvals",
      "❌ No payment tracking",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  // 🔵 SOLO — Get Organized
  {
    id: "solo",
    name: "Solo",
    price: "$29",
    period: "/month",
    badge: "Get Organized",
    description: "For solo contractors, freelancers, and tradesmen",
    copy: "I'm faster and organized… but extras can still slip.",
    features: [
      "✅ Unlimited voice-to-invoice",
      "✅ Unlimited invoices",
      "✅ Projects (manual creation)",
      "✅ Invoice history",
      "✅ Email / WhatsApp invoice sending",
      "✅ Payment status tracking",
      "✅ Receipt scanning (AI extraction)",
      "❌ No scope proof & client approval",
      "❌ No approval reminders",
    ],
    cta: "Upgrade to Solo",
    highlighted: false,
  },
  // 🟡 PROFESSIONAL — Protect Your Money (⭐ MOST POPULAR)
  {
    id: "professional",
    name: "Professional",
    price: "$34.99",
    period: "/month",
    badge: "⭐ Most Popular",
    description: "TellBill's core money protection tier",
    copy: "Capture extra work. Get client approval instantly. Auto-add to invoices. Stop losing money.",
    features: [
      "✅ Everything in Solo",
      "✅ Scope proof cards (extra work detection)",
      "✅ Client approval via secure link",
      "✅ Auto-add approved work to invoices",
      "✅ Photo proof with timestamps",
      "✅ Approval reminders",
      "✅ Dispute-ready work logs",
      "✅ Unlimited projects",
    ],
    cta: "Get Professional",
    highlighted: true,
  },

];
