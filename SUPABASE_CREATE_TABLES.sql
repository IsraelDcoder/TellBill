-- ============================================================================
-- TELLBILL DATABASE SCHEMA - PostgreSQL
-- Auto-generated from shared/schema.ts Drizzle definitions
-- Run this in Supabase SQL Editor to create all required tables
-- ============================================================================

-- CREATE users TABLE (core)
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "name" text,
  "company_name" text,
  "company_phone" text,
  "company_email" text,
  "company_address" text,
  "company_website" text,
  "company_tax_id" text,
  "current_plan" text DEFAULT 'free',
  "is_subscribed" boolean DEFAULT false,
  "subscription_status" text DEFAULT 'inactive',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  -- RevenueCat fields
  "revenuecat_app_user_id" text,
  "subscription_platform" text,
  "subscription_tier" text DEFAULT 'free',
  "subscription_expiry_date" timestamp with time zone,
  "subscription_renewal_date" timestamp with time zone,
  "subscription_cancellation_date" timestamp with time zone,
  "is_trialing" boolean DEFAULT false,
  "subscription_updated_at" timestamp with time zone DEFAULT NOW(),
  -- Stripe fields
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "stripe_price_id" text,
  -- Security fields
  "email_verified_at" timestamp with time zone,
  "failed_login_attempts" integer DEFAULT 0,
  "locked_until" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_revenuecat_app_user_id" ON "users"("revenuecat_app_user_id");
CREATE INDEX IF NOT EXISTS "idx_users_subscription_status" ON "users"("subscription_status");
CREATE INDEX IF NOT EXISTS "idx_users_stripe_customer_id" ON "users"("stripe_customer_id");

-- CREATE webhook_processed TABLE (Stripe webhook idempotency)
CREATE TABLE IF NOT EXISTS "webhook_processed" (
  "id" text PRIMARY KEY NOT NULL,
  "stripe_event_id" text NOT NULL UNIQUE,
  "event_type" text NOT NULL,
  "processed_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "metadata" text
);

CREATE INDEX IF NOT EXISTS "idx_webhook_processed_stripe_event_id" ON "webhook_processed"("stripe_event_id");
CREATE INDEX IF NOT EXISTS "idx_webhook_processed_processed_at" ON "webhook_processed"("processed_at");

-- CREATE refresh_tokens TABLE
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "revoked_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_revoked_at" ON "refresh_tokens"("revoked_at");

-- CREATE job_sites TABLE
CREATE TABLE IF NOT EXISTS "job_sites" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "location" text,
  "description" text,
  "status" text DEFAULT 'active',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_job_sites_user_id" ON "job_sites"("user_id");

-- CREATE preferences TABLE
CREATE TABLE IF NOT EXISTS "preferences" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "currency" text DEFAULT 'USD',
  "language" text DEFAULT 'en',
  "theme" text DEFAULT 'light',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_preferences_user_id" ON "preferences"("user_id");

-- CREATE projects TABLE
CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "client_name" text,
  "address" text,
  "status" text DEFAULT 'active',
  "budget" numeric(12, 2) DEFAULT '0',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_projects_user_id" ON "projects"("user_id");

-- CREATE invoices TABLE
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by" text,
  "status" text DEFAULT 'draft',
  "subtotal" numeric(12, 2) DEFAULT '0',
  "tax_name" text,
  "tax_rate" numeric(5, 2),
  "tax_applies_to" text,
  "tax_amount" numeric(12, 2) DEFAULT '0',
  "total" numeric(12, 2) DEFAULT '0',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_invoices_project_id" ON "invoices"("project_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_user_id" ON "invoices"("user_id");

-- CREATE tax_profiles TABLE
CREATE TABLE IF NOT EXISTS "tax_profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "rate" numeric(5, 2) NOT NULL,
  "applies_to" text NOT NULL,
  "enabled" boolean DEFAULT false,
  "is_default" boolean DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_tax_profiles_user_id" ON "tax_profiles"("user_id");

-- CREATE activity_log TABLE
CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "action" text NOT NULL,
  "metadata" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_activity_log_user_id" ON "activity_log"("user_id");

-- CREATE receipts TABLE
CREATE TABLE IF NOT EXISTS "receipts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "vendor" text NOT NULL,
  "total_amount" numeric(12, 2) NOT NULL,
  "currency" text DEFAULT 'USD',
  "purchase_date" timestamp with time zone NOT NULL,
  "image_url" text NOT NULL,
  "billable" boolean NOT NULL,
  "not_billable_reason" text,
  "client_name" text,
  "client_email" text,
  "linked_invoice_id" text REFERENCES "invoices"("id") ON DELETE SET NULL,
  "items" text DEFAULT '[]',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_receipts_user_id" ON "receipts"("user_id");

-- CREATE payments TABLE
CREATE TABLE IF NOT EXISTS "payments" (
  "id" text PRIMARY KEY NOT NULL,
  "invoice_id" text NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" numeric(12, 2) NOT NULL,
  "method" text,
  "reference" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_payments_invoice_id" ON "payments"("invoice_id");

-- CREATE project_events TABLE
CREATE TABLE IF NOT EXISTS "project_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "audio_id" text,
  "event_type" text NOT NULL,
  "source" text NOT NULL,
  "confidence" numeric(3, 2),
  "transcript" text,
  "data" text,
  "visible_to_client" boolean DEFAULT true,
  "approval_status" text DEFAULT 'PENDING',
  "approved_at" timestamp with time zone,
  "approval_notes" text,
  "photos" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "is_deleted" boolean DEFAULT false,
  "deleted_at" timestamp with time zone,
  "deletion_reason" text
);

CREATE INDEX IF NOT EXISTS "idx_project_events_project_id" ON "project_events"("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_events_user_id" ON "project_events"("user_id");

-- CREATE scope_proofs TABLE
CREATE TABLE IF NOT EXISTS "scope_proofs" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" text REFERENCES "projects"("id") ON DELETE SET NULL,
  "invoice_id" text REFERENCES "invoices"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "estimated_cost" numeric(10, 2) NOT NULL,
  "photos" text DEFAULT '[]',
  "status" text DEFAULT 'pending',
  "approval_token" text NOT NULL UNIQUE,
  "token_expires_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "approved_by" text,
  "feedback" text,
  "feedback_from" text,
  "feedback_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_scope_proofs_user_id" ON "scope_proofs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_scope_proofs_project_id" ON "scope_proofs"("project_id");
CREATE INDEX IF NOT EXISTS "idx_scope_proofs_approval_token" ON "scope_proofs"("approval_token");

-- CREATE scope_proof_notifications TABLE
CREATE TABLE IF NOT EXISTS "scope_proof_notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "scope_proof_id" text NOT NULL REFERENCES "scope_proofs"("id") ON DELETE CASCADE,
  "notification_type" text NOT NULL,
  "sent_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "sent_via" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_scope_proof_notifications_scope_proof_id" ON "scope_proof_notifications"("scope_proof_id");

-- CREATE material_cost_events TABLE
CREATE TABLE IF NOT EXISTS "material_cost_events" (
  "id" text PRIMARY KEY NOT NULL,
  "receipt_id" text NOT NULL REFERENCES "receipts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "metadata" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_material_cost_events_receipt_id" ON "material_cost_events"("receipt_id");

-- CREATE money_alerts TABLE
CREATE TABLE IF NOT EXISTS "money_alerts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "client_name" text,
  "client_email" text,
  "estimated_amount" numeric(12, 2),
  "currency" text DEFAULT 'USD',
  "confidence" integer,
  "reason_resolved" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_money_alerts_user_id" ON "money_alerts"("user_id");

-- CREATE money_alert_events TABLE
CREATE TABLE IF NOT EXISTS "money_alert_events" (
  "id" text PRIMARY KEY NOT NULL,
  "alert_id" text NOT NULL REFERENCES "money_alerts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "metadata" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_money_alert_events_alert_id" ON "money_alert_events"("alert_id");

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- All tables and indexes are now ready for TellBill
-- ============================================================================
