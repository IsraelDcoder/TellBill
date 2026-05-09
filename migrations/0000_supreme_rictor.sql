CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"action" text NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_invoice_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text,
	"client_email" text,
	"name" text NOT NULL,
	"base_template" text NOT NULL,
	"primary_color" text DEFAULT '#667eea',
	"accent_color" text DEFAULT '#764ba2',
	"background_color" text DEFAULT '#ffffff',
	"text_color" text DEFAULT '#333333',
	"logo_url" text,
	"company_header_text" text,
	"footer_text" text,
	"show_project_name" boolean DEFAULT false,
	"show_po_number" boolean DEFAULT false,
	"show_work_order_number" boolean DEFAULT false,
	"custom_field_1_name" text,
	"custom_field_1_value" text,
	"custom_field_2_name" text,
	"custom_field_2_value" text,
	"font_family" text DEFAULT 'system',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "early_access" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"trade" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "early_access_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text,
	"created_by" text,
	"invoice_number" text,
	"status" text DEFAULT 'draft',
	"client_name" text,
	"client_email" text,
	"client_phone" text,
	"client_address" text,
	"job_address" text,
	"job_description" text,
	"items" text DEFAULT '[]',
	"labor_hours" integer DEFAULT 0,
	"labor_rate" integer DEFAULT 0,
	"labor_total" numeric(12, 2) DEFAULT '0',
	"materials_total" numeric(12, 2) DEFAULT '0',
	"items_total" numeric(12, 2) DEFAULT '0',
	"subtotal" numeric(12, 2) DEFAULT '0',
	"tax_name" text,
	"tax_rate" numeric(5, 2),
	"tax_applies_to" text,
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"safety_notes" text,
	"payment_terms" text,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"day6_reminder_sent_at" timestamp with time zone,
	"payment_method_type_override" text,
	"payment_account_number_override" text,
	"payment_bank_name_override" text,
	"payment_account_name_override" text,
	"payment_link_override" text,
	"payment_instructions_override" text
);
--> statement-breakpoint
CREATE TABLE "job_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"description" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_cost_events" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_alert_events" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"client_name" text,
	"client_email" text,
	"estimated_amount" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"confidence" integer,
	"reason_resolved" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"currency" text DEFAULT 'USD',
	"language" text DEFAULT 'en',
	"theme" text DEFAULT 'light',
	"default_tax_profile_id" text,
	"invoice_template" text DEFAULT 'default',
	"default_payment_terms" text DEFAULT 'Due upon receipt',
	"late_payment_reminders" boolean DEFAULT true,
	"auto_remind_frequency" integer DEFAULT 3,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp with time zone,
	"deletion_reason" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"client_name" text,
	"address" text,
	"status" text DEFAULT 'active',
	"budget" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vendor" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"purchase_date" timestamp with time zone NOT NULL,
	"image_url" text NOT NULL,
	"billable" boolean NOT NULL,
	"not_billable_reason" text,
	"client_name" text,
	"client_email" text,
	"linked_invoice_id" text,
	"items" text DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_bonuses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"successful_referrals" integer DEFAULT 0,
	"bonus_earned_at" timestamp with time zone,
	"bonus_redeemed_at" timestamp with time zone,
	"bonus_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_bonuses_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_conversions" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"referral_code" text NOT NULL,
	"status" text DEFAULT 'pending',
	"converted_at" timestamp with time zone,
	"bonus_claimed_at" timestamp with time zone,
	"bonus_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scope_proof_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_proof_id" text NOT NULL,
	"notification_type" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_via" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scope_proofs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"invoice_id" text,
	"description" text NOT NULL,
	"estimated_cost" numeric(10, 2) NOT NULL,
	"photos" text DEFAULT '[]',
	"status" text DEFAULT 'pending',
	"approval_token" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"feedback" text,
	"feedback_from" text,
	"feedback_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scope_proofs_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "tax_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"applies_to" text NOT NULL,
	"enabled" boolean DEFAULT false,
	"is_default" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"company_name" text,
	"company_phone" text,
	"company_email" text,
	"company_address" text,
	"company_website" text,
	"company_tax_id" text,
	"preferred_currency" text DEFAULT 'USD',
	"default_tax_rate" numeric(5, 2) DEFAULT '8.00',
	"invoice_template" text DEFAULT 'default',
	"default_payment_terms" text DEFAULT 'Due upon receipt',
	"current_plan" text DEFAULT 'free',
	"is_subscribed" boolean DEFAULT false,
	"subscription_status" text DEFAULT 'inactive',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revenuecat_app_user_id" text,
	"subscription_platform" text,
	"subscription_tier" text DEFAULT 'free',
	"subscription_expiry_date" timestamp with time zone,
	"subscription_renewal_date" timestamp with time zone,
	"subscription_cancellation_date" timestamp with time zone,
	"is_trialing" boolean DEFAULT false,
	"subscription_updated_at" timestamp with time zone DEFAULT now(),
	"payment_method_type" text DEFAULT 'custom',
	"payment_account_number" text,
	"payment_bank_name" text,
	"payment_account_name" text,
	"payment_link" text,
	"payment_instructions" text,
	"email_verified_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_processed" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "webhook_processed_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_invoice_templates" ADD CONSTRAINT "custom_invoice_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_sites" ADD CONSTRAINT "job_sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_cost_events" ADD CONSTRAINT "material_cost_events_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_cost_events" ADD CONSTRAINT "material_cost_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_alert_events" ADD CONSTRAINT "money_alert_events_alert_id_money_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."money_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_alert_events" ADD CONSTRAINT "money_alert_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_alerts" ADD CONSTRAINT "money_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_linked_invoice_id_invoices_id_fk" FOREIGN KEY ("linked_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_bonuses" ADD CONSTRAINT "referral_bonuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_proof_notifications" ADD CONSTRAINT "scope_proof_notifications_scope_proof_id_scope_proofs_id_fk" FOREIGN KEY ("scope_proof_id") REFERENCES "public"."scope_proofs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_proofs" ADD CONSTRAINT "scope_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_proofs" ADD CONSTRAINT "scope_proofs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_proofs" ADD CONSTRAINT "scope_proofs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_profiles" ADD CONSTRAINT "tax_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;