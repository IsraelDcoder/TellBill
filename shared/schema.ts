import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

export const users = sqliteTable("users", {
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
  isSubscribed: integer("is_subscribed", { mode: "boolean" }).default(false),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, cancelled, expired
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Job Sites table - for team level usage
export const jobSites = sqliteTable("job_sites", {
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
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Inventory Items table - items at each job site
export const inventoryItems = sqliteTable("inventory_items", {
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
  unitCost: integer("unit_cost").default(0), // stored in cents
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Stock History table - audit trail for inventory changes
export const stockHistory = sqliteTable("stock_history", {
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
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Reorder Orders table - track reorder requests
export const reorderOrders = sqliteTable("reorder_orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  itemId: text("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  status: text("status").default("pending"), // pending, ordered, received, cancelled
  orderDate: integer("order_date", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  expectedDate: integer("expected_date", { mode: "timestamp_ms" }),
  receivedDate: integer("received_date", { mode: "timestamp_ms" }),
  supplier: text("supplier"),
  notes: text("notes"),
});

export type JobSite = typeof jobSites.$inferSelect;
export type InsertJobSite = typeof jobSites.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;
export type StockHistory = typeof stockHistory.$inferSelect;
export type ReorderOrder = typeof reorderOrders.$inferSelect;
/**
 * ✅ USER DATA OWNERSHIP ENFORCEMENT
 *
 * RULE: Every piece of data MUST belong to a userId
 *
 * The following tables track user data ownership:
 * - invoices
 * - profiles
 * - companyInfo
 * - projects
 * - team
 * - preferences
 * - activityLog
 *
 * Each table MUST have userId or chain to userId (e.g., siteId → jobSites.userId)
 */

// Invoices table - tracks all user invoices
export const invoices = sqliteTable("invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: Every invoice belongs to a user
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientAddress: text("client_address"),
  jobAddress: text("job_address"),
  subtotal: integer("subtotal").default(0),
  tax: integer("tax").default(0),
  total: integer("total").default(0),
  status: text("status").default("draft"), // draft, sent, pending, paid, overdue
  notes: text("notes"),
  safetyNotes: text("safety_notes"),
  paymentTerms: text("payment_terms"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  dueDate: integer("due_date", { mode: "timestamp_ms" }),
});

// Profiles table - tracks user profile information
export const profiles = sqliteTable("profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: One profile per user
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Company Info table - tracks user's company information
export const companyInfo = sqliteTable("company_info", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: One company per user
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyAddress: text("company_address"),
  companyWebsite: text("company_website"),
  companyTaxId: text("company_tax_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Projects table - tracks user projects
export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: Every project belongs to a user
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"), // active, inactive, completed
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Team Members table - tracks team members (users invited by owner)
export const team = sqliteTable("team", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: Team member belongs to owner user
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  memberEmail: text("member_email"),
  role: text("role").default("member"), // owner, admin, member
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Activity Log table - audit trail of user actions
export const activityLog = sqliteTable("activity_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: Every activity belongs to a user
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // created_invoice, sent_invoice, etc.
  resourceType: text("resource_type"), // invoice, project, etc.
  resourceId: text("resource_id"),
  details: text("details"), // JSON string with metadata
  timestamp: integer("timestamp", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Preferences table - tracks user app preferences
export const preferences = sqliteTable("preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  // ✅ OWNERSHIP: One preferences record per user
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).default(true),
  emailOnInvoiceSent: integer("email_on_invoice_sent", { mode: "boolean" }).default(true),
  darkMode: integer("dark_mode", { mode: "boolean" }).default(false),
  theme: text("theme").default("default"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Type exports
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = typeof companyInfo.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type TeamMember = typeof team.$inferSelect;
export type InsertTeamMember = typeof team.$inferInsert;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;
export type Preference = typeof preferences.$inferSelect;
export type InsertPreference = typeof preferences.$inferInsert;