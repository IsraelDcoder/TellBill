import { sql } from "drizzle-orm";
import { pgTable, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

// ✅ MIGRATION NOTE: Changed from sqliteTable to pgTable, updated types for PostgreSQL
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

// Inventory Items table - items at each job site
export const inventoryItems = pgTable("inventory_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  siteId: text("site_id")
    .notNull()
    .references(() => jobSites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // materials, tools, equipment, supplies
  unit: text("unit").default("pcs"), // pcs, kg, liters, meters, etc.
  currentStock: integer("current_stock").default(0),
  minimumStock: integer("minimum_stock").default(10),
  reorderQuantity: integer("reorder_quantity").default(50),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).default("0"), // USD with 2 decimals
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Stock History table - audit trail for inventory changes
export const stockHistory = pgTable("stock_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  itemId: text("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // add, remove, reorder, adjust
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Reorder Orders table - track reorder requests
export const reorderOrders = pgTable("reorder_orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  itemId: text("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  status: text("status").default("pending"), // pending, ordered, received, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Team table - for managing team members
export const team = pgTable("team", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberName: text("member_name"),
  memberEmail: text("member_email"),
  role: text("role").default("member"), // admin, manager, member
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Team = typeof team.$inferSelect;

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
