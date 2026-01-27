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
  currentPlan: text("current_plan").default("free"), // free, solo, team, enterprise
  isSubscribed: boolean("is_subscribed").default(false),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, cancelled, expired
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

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

// Preferences table - user preferences
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
  createdAt: timestamp("created_at", { withTimezone: true })
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
  status: text("status").default("draft"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Invoice = typeof invoices.$inferSelect;

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

// Receipts table
export const receipts = pgTable("receipts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  cloudPath: text("cloud_path"),
  isProcessed: boolean("is_processed").default(false),
  extractedData: text("extracted_data"), // JSON
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Receipt = typeof receipts.$inferSelect;

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