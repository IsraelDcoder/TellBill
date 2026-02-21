import { sql } from "drizzle-orm";
import { pgTable, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

// MIGRATION NOTE: Changed from sqliteTable to pgTable, updated types for PostgreSQL
// - integer("created_at", { mode: "timestamp_ms" }) → timestamp with time zone
// - real → numeric for financial precision
// - integer with boolean mode → native boolean type

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  companyName: text("company_name"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyAddress: text("company_address"),
  companyWebsite: text("company_website"),
  companyTaxId: text("company_tax_id"),
  // ✅ User preferences (default values for new invoices)
  preferredCurrency: text("preferred_currency").default("USD"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).default("8.00"),
  invoiceTemplate: text("invoice_template").default("default"), // default, minimal, detailed
  defaultPaymentTerms: text("default_payment_terms").default("Due upon receipt"),
  // Subscription fields
  currentPlan: text("current_plan").default("free"), // free, solo, professional
  isSubscribed: boolean("is_subscribed").default(false),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, cancelled, expired
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // RevenueCat subscription fields (replaces Flutterwave)
  revenuecatAppUserId: text("revenuecat_app_user_id"), // RevenueCat customer ID
  subscriptionPlatform: text("subscription_platform"), // "ios" or "android"
  subscriptionTier: text("subscription_tier").default("free"), // free, solo, professional
  subscriptionExpiryDate: timestamp("subscription_expiry_date", { withTimezone: true }),
  subscriptionRenewalDate: timestamp("subscription_renewal_date", { withTimezone: true }),
  subscriptionCancellationDate: timestamp("subscription_cancellation_date", { withTimezone: true }),
  isTrialing: boolean("is_trialing").default(false),
  subscriptionUpdatedAt: timestamp("subscription_updated_at", { withTimezone: true }).defaultNow(),
  // Stripe subscription fields
  stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe subscription ID
  stripePriceId: text("stripe_price_id"), // Current Stripe price ID (solo, professional)
  // ✅ Payment info for non-payment-processor model (user's own payment instructions)
  paymentMethodType: text("payment_method_type").default("custom"), // bank_transfer, paypal, stripe, square, mobile_money, custom
  paymentAccountNumber: text("payment_account_number"), // Bank account or mobile money
  paymentBankName: text("payment_bank_name"), // Bank name
  paymentAccountName: text("payment_account_name"), // Account holder name
  paymentLink: text("payment_link"), // PayPal, Stripe link, etc.
  paymentInstructions: text("payment_instructions"), // Custom instructions
  // Security: Email verification
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }), // NULL = not verified, timestamp = verified time
  // Security: Account lockout
  failedLoginAttempts: integer("failed_login_attempts").default(0), // Counter for failed login attempts
  lockedUntil: timestamp("locked_until", { withTimezone: true }), // NULL = not locked, timestamp = lock expiration time
});

/**
 * Webhook Processing Tracking Table
 * Used to prevent duplicate webhook processing from Stripe
 * (Stripe retries webhooks if they timeout, this prevents double-charging)
 */
export const webhookProcessed = pgTable("webhook_processed", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  stripeEventId: text("stripe_event_id").notNull().unique(), // Unique Stripe event ID
  eventType: text("event_type").notNull(), // checkout.session.completed, invoice.payment_succeeded, etc
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  metadata: text("metadata"), // JSON metadata if needed
});

export type WebhookProcessed = typeof webhookProcessed.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

/**
 * Refresh Token Storage Table
 * Allows secure refresh token rotation without storing sensitive data in local storage
 */
export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(), // Hashed refresh token
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // When this refresh token expires
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }), // NULL = active, timestamp = revoked time
});

export type RefreshToken = typeof refreshTokens.$inferSelect;

/**
 * Password Reset Token Storage Table
 * Allows secure password reset with time-limited tokens
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // Hashed reset token
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // When this reset token expires (typically 15 min)
  usedAt: timestamp("used_at", { withTimezone: true }), // NULL = not used, timestamp = when reset was completed
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Job Sites table - for team level usage
export const jobSites = pgTable("job_sites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  status: text("status").default("active"), // active, inactive, completed
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Preferences table - user preferences (UI and behavior settings)
export const preferences = pgTable("preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  currency: text("currency").default("USD"),
  language: text("language").default("en"),
  theme: text("theme").default("light"),
  defaultTaxProfileId: text("default_tax_profile_id"), // Link to user's default tax profile
  invoiceTemplate: text("invoice_template").default("default"), // default, minimal, detailed
  defaultPaymentTerms: text("default_payment_terms").default("Due upon receipt"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  clientName: text("client_name"),
  address: text("address"),
  status: text("status").default("active"),
  budget: numeric("budget", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Project = typeof projects.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdBy: text("created_by"),
  invoiceNumber: text("invoice_number"),
  status: text("status").default("draft"),
  // Client information
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientAddress: text("client_address"),
  // Job information
  jobAddress: text("job_address"),
  jobDescription: text("job_description"),
  // Line items (stored as JSON)
  items: text("items").default("[]"), // JSON array
  // Labor details
  laborHours: integer("labor_hours").default(0),
  laborRate: integer("labor_rate").default(0), // in cents
  laborTotal: numeric("labor_total", { precision: 12, scale: 2 }).default("0"),
  // Materials
  materialsTotal: numeric("materials_total", { precision: 12, scale: 2 }).default("0"),
  itemsTotal: numeric("items_total", { precision: 12, scale: 2 }).default("0"),
  // Financial breakdown (immutable snapshots at time of invoice creation)
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxName: text("tax_name"), // e.g., "Sales Tax", "VAT"
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }), // e.g., 7.5
  taxAppliesto: text("tax_applies_to"), // labor_only, materials_only, labor_and_materials
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  // Invoice metadata
  notes: text("notes"),
  safetyNotes: text("safety_notes"),
  paymentTerms: text("payment_terms"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }), // ✅ Track when payment reminder was sent
  
  // ✅ Payment info override (company-level default can be overridden per invoice)
  paymentMethodTypeOverride: text("payment_method_type_override"),
  paymentAccountNumberOverride: text("payment_account_number_override"),
  paymentBankNameOverride: text("payment_bank_name_override"),
  paymentAccountNameOverride: text("payment_account_name_override"),
  paymentLinkOverride: text("payment_link_override"),
  paymentInstructionsOverride: text("payment_instructions_override"),
  
  // Payment tracking (Stripe)
  paymentLinkUrl: text("payment_link_url"), // Stripe checkout URL for this invoice
  stripeCheckoutSessionId: text("stripe_checkout_session_id"), // Stripe session ID
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment intent ID
});

export type Invoice = typeof invoices.$inferSelect;

// Tax Profiles table - User-configurable tax settings
export const taxProfiles = pgTable("tax_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Sales Tax", "VAT", "GST"
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(), // 0.00 to 30.00
  appliesto: text("applies_to").notNull(), // labor_only, materials_only, labor_and_materials
  enabled: boolean("enabled").default(false), // Tax turned on/off
  isDefault: boolean("is_default").default(true), // User's default tax profile
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TaxProfile = typeof taxProfiles.$inferSelect;
export type InsertTaxProfile = typeof taxProfiles.$inferInsert;

// Activity Log table
export const activityLog = pgTable("activity_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(), // invoice, project, receipt
  resourceId: text("resource_id").notNull(),
  action: text("action").notNull(), // created, updated, deleted, sent
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ActivityLog = typeof activityLog.$inferSelect;

/**
 * ✅ MATERIAL COST CAPTURE (Receipt Scanner v2)
 *
 * Paid-only feature for contractors to capture and track material costs
 * Prevents contractors from eating material costs
 * Forces billing decision for every receipt
 */
export const receipts = pgTable("receipts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  vendor: text("vendor").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull(),
  imageUrl: text("image_url").notNull(),
  
  // Billing decision
  billable: boolean("billable").notNull(), // true = bill to client, false = not billable
  notBillableReason: text("not_billable_reason"), // personal, overhead, warranty, other
  
  // Client info (if billable)
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  
  // Invoice linkage
  linkedInvoiceId: text("linked_invoice_id")
    .references(() => invoices.id, { onDelete: "set null" }),
  
  // Extracted items (JSON array of {name, quantity, unitPrice, total})
  items: text("items").default("[]"),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;

// Payments table
export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method"), // cash, check, transfer
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Payment = typeof payments.$inferSelect;

// Project Events table - append-only ledger for project recordings
export const projectEvents = pgTable("project_events", {
  eventId: text("event_id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  audioId: text("audio_id"),
  eventType: text("event_type").notNull(), // LABOR | MATERIAL | PROGRESS | ALERT
  source: text("source").notNull(), // VOICE | MANUAL | IMPORT
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  transcript: text("transcript"),
  data: text("data"), // JSON
  visibleToClient: boolean("visible_to_client").default(true),
  approvalStatus: text("approval_status").default("PENDING"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalNotes: text("approval_notes"),
  photos: text("photos"), // JSON array
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletionReason: text("deletion_reason"),
});

export type ProjectEvent = typeof projectEvents.$inferSelect;
export type InsertProjectEvent = typeof projectEvents.$inferInsert;
/**
 * ✅ SCOPE PROOF & CLIENT APPROVAL ENGINE
 * 
 * Captures extra/out-of-scope work, gets client approval immediately,
 * auto-converts to invoice line items.
 * 
 * Revenue protection core feature - prevents contractors from losing money
 * due to forgotten extra work, scope creep, or client disputes.
 */
export const scopeProofs = pgTable("scope_proofs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "set null" }),
  invoiceId: text("invoice_id")
    .references(() => invoices.id, { onDelete: "set null" }),

  // Work description (AI-extracted or manual)
  description: text("description").notNull(),

  // Cost estimation
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }).notNull(),

  // Photo URLs (JSON array of image URLs)
  photos: text("photos").default("[]"), // JSON stringified array

  // Status tracking
  status: text("status").default("pending"), // pending | approved | expired

  // Client approval
  approvalToken: text("approval_token").notNull().unique(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: text("approved_by"), // Client email

  // Client feedback (if they have questions or concerns)
  feedback: text("feedback"), // Client's feedback/questions
  feedbackFrom: text("feedback_from"), // Client email who gave feedback
  feedbackAt: timestamp("feedback_at", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ScopeProof = typeof scopeProofs.$inferSelect;
export type InsertScopeProof = typeof scopeProofs.$inferInsert;

/**
 * Track notifications sent for scope proofs
 * Used for managing reminders at 12 hours
 */
export const scopeProofNotifications = pgTable("scope_proof_notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  scopeProofId: text("scope_proof_id")
    .notNull()
    .references(() => scopeProofs.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(), // initial | reminder
  sentAt: timestamp("sent_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sentVia: text("sent_via").notNull(), // email | sms | whatsapp
});

export type ScopeProofNotification = typeof scopeProofNotifications.$inferSelect;
export type InsertScopeProofNotification = typeof scopeProofNotifications.$inferInsert;

/**
 * Material Cost Events - Audit trail for material cost captures
 * Tracks all actions taken on receipts
 */
export const materialCostEvents = pgTable("material_cost_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  receiptId: text("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // CREATED | MARKED_BILLABLE | MARKED_NON_BILLABLE | ATTACHED_TO_INVOICE
  metadata: text("metadata"), // JSON for additional context
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MaterialCostEvent = typeof materialCostEvents.$inferSelect;
export type InsertMaterialCostEvent = typeof materialCostEvents.$inferInsert;

/**
 * Money Alerts - Detects unbilled work (receipts, scope, voice logs, unsent invoices)
 * Paid-only feature (Solo+)
 */
export const moneyAlerts = pgTable("money_alerts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // RECEIPT_UNBILLED | SCOPE_APPROVED_NO_INVOICE | VOICE_LOG_NO_INVOICE | INVOICE_NOT_SENT
  status: text("status").notNull().default("open"), // OPEN | RESOLVED | FIXED
  sourceType: text("source_type").notNull(), // RECEIPT | SCOPE | TRANSCRIPT | INVOICE
  sourceId: text("source_id").notNull(), // points to receipt/scope/transcript/invoice record
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  estimatedAmount: numeric("estimated_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD"),
  confidence: integer("confidence"), // 0-100
  reasonResolved: text("reason_resolved"), // why it was dismissed/resolved
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MoneyAlert = typeof moneyAlerts.$inferSelect;
export type InsertMoneyAlert = typeof moneyAlerts.$inferInsert;

/**
 * Money Alert Events - Audit trail for money alert actions
 */
export const moneyAlertEvents = pgTable("money_alert_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  alertId: text("alert_id")
    .notNull()
    .references(() => moneyAlerts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // CREATED | FIXED | RESOLVED
  metadata: text("metadata"), // JSON for additional context
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MoneyAlertEvent = typeof moneyAlertEvents.$inferSelect;

/**
 * ✅ Custom Invoice Templates - Professional user template customization
 * Allows users to customize invoice templates per client or as default
 */
export const customInvoiceTemplates = pgTable("custom_invoice_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id"), // NULL = default template, filled = per-client
  clientEmail: text("client_email"),
  name: text("name").notNull(), // e.g., "Blue Minimalist"
  baseTemplate: text("base_template").notNull(), // professional, modern, minimal, formal
  
  // Color customization
  primaryColor: text("primary_color").default("#667eea"),
  accentColor: text("accent_color").default("#764ba2"),
  backgroundColor: text("background_color").default("#ffffff"),
  textColor: text("text_color").default("#333333"),
  
  // Branding
  logoUrl: text("logo_url"),
  companyHeaderText: text("company_header_text"),
  footerText: text("footer_text"),
  
  // Custom fields
  showProjectName: boolean("show_project_name").default(false),
  showPoNumber: boolean("show_po_number").default(false),
  showWorkOrderNumber: boolean("show_work_order_number").default(false),
  customField1Name: text("custom_field_1_name"),
  customField1Value: text("custom_field_1_value"),
  customField2Name: text("custom_field_2_name"),
  customField2Value: text("custom_field_2_value"),
  
  // Font
  fontFamily: text("font_family").default("system"),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * ✅ Early Access Waitlist - Limited early access program (50 contractors)
 * Captures emails from prospective users before public launch
 */
export const earlyAccess = pgTable("early_access", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  trade: text("trade"), // Type of contracting work (plumbing, electrical, etc)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EarlyAccess = typeof earlyAccess.$inferSelect;
export type InsertEarlyAccess = typeof earlyAccess.$inferInsert;

export type CustomInvoiceTemplate = typeof customInvoiceTemplates.$inferSelect;
export type InsertCustomInvoiceTemplate = typeof customInvoiceTemplates.$inferInsert;
export type InsertMoneyAlertEvent = typeof moneyAlertEvents.$inferInsert;